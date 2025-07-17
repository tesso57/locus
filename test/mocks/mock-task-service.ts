import { err, ok, Result } from "../../src/utils/result.ts";
import {
  CreateTaskOptions,
  ListTaskOptions,
  TaskInfo,
  TaskService,
  UpdateTaskOptions,
} from "../../src/services/task-service.ts";
import { RepoInfo } from "../../src/types.ts";
import { TaskNotFoundError } from "../../src/utils/errors.ts";

export class MockTaskService implements TaskService {
  private tasks: Map<string, TaskInfo> = new Map();
  private errors: Map<string, Error> = new Map();
  private listResult: TaskInfo[] = [];
  private fileSystem: any = null;

  setFileSystem(fs: any): void {
    this.fileSystem = fs;
  }

  setTask(fileName: string, task: TaskInfo): void {
    this.tasks.set(fileName, task);
  }

  setError(fileName: string, error: Result<never, Error>): void {
    if (!error.ok) {
      this.errors.set(fileName, error.error);
    }
  }

  setListResult(tasks: TaskInfo[]): void {
    this.listResult = tasks;
  }

  listTasks(_options: ListTaskOptions): Promise<Result<TaskInfo[], Error>> {
    return Promise.resolve(ok(this.listResult));
  }

  getTask(fileName: string, _repoInfo?: RepoInfo | null): Promise<Result<TaskInfo, Error>> {
    const error = this.errors.get(fileName);
    if (error) {
      return Promise.resolve(err(error));
    }

    // Try with and without .md extension
    let task = this.tasks.get(fileName);
    if (!task && !fileName.endsWith(".md")) {
      task = this.tasks.get(fileName + ".md");
    }
    if (!task && fileName.endsWith(".md")) {
      task = this.tasks.get(fileName.replace(".md", ""));
    }

    if (!task) {
      return Promise.resolve(err(new TaskNotFoundError(fileName)));
    }

    return Promise.resolve(ok(task));
  }

  async createTask(options: CreateTaskOptions): Promise<Result<string, Error>> {
    // Generate filename with date and hash pattern
    const slug = options.title.toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    const date = new Date().toISOString().split("T")[0];
    const hash = Math.random().toString(36).substring(2, 10);
    const fileName = `${date}-${slug}-${hash}.md`;

    const task: TaskInfo = {
      fileName,
      title: options.title,
      status: options.status || "todo",
      priority: options.priority || "normal",
      tags: options.tags || [],
      created: new Date().toISOString(),
      path: fileName,
      frontmatter: {
        date,
        created: new Date().toISOString(),
        status: options.status || "todo",
        priority: options.priority || "normal",
        tags: options.tags || [],
      },
      body: options.body || `# ${options.title}`,
    };

    this.tasks.set(fileName, task);

    // If fileSystem is set, write the actual file
    if (this.fileSystem && options.repoInfo) {
      const taskPath =
        `/home/user/locus/${options.repoInfo.owner}/${options.repoInfo.repo}/${fileName}`;

      // Generate markdown content
      const frontmatterContent = Object.entries(task.frontmatter)
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            return `${key}:\n${value.map((v) => `  - ${v}`).join("\n")}`;
          }
          return `${key}: ${typeof value === "string" ? `'${value}'` : value}`;
        })
        .join("\n");

      const content = `---\n${frontmatterContent}\n---\n${task.body}`;

      await this.fileSystem.writeTextFile(taskPath, content);
      task.path = taskPath;
    }

    return Promise.resolve(ok(fileName));
  }

  async updateTask(options: UpdateTaskOptions): Promise<Result<void, Error>> {
    // Try with and without .md extension
    let task = this.tasks.get(options.fileName);
    if (!task && !options.fileName.endsWith(".md")) {
      task = this.tasks.get(options.fileName + ".md");
    }
    if (!task && options.fileName.endsWith(".md")) {
      task = this.tasks.get(options.fileName.replace(".md", ""));
    }

    if (!task) {
      return Promise.resolve(err(new TaskNotFoundError(options.fileName)));
    }

    if (options.title) task.title = options.title;
    if (options.body !== undefined) task.body = options.body;
    if (options.frontmatter) {
      task.frontmatter = { ...task.frontmatter, ...options.frontmatter };
    }

    // If fileSystem is set, update the actual file
    if (this.fileSystem && task.path && task.path.startsWith("/home/user/locus/")) {
      // Generate markdown content
      const frontmatterContent = Object.entries(task.frontmatter)
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            return `${key}:\n${value.map((v) => `  - ${v}`).join("\n")}`;
          }
          return `${key}: ${typeof value === "string" ? `'${value}'` : value}`;
        })
        .join("\n");

      const content = `---\n${frontmatterContent}\n---\n${task.body}`;

      await this.fileSystem.writeTextFile(task.path, content);
    }

    return Promise.resolve(ok(undefined));
  }

  deleteTask(fileName: string, _repoInfo?: RepoInfo | null): Promise<Result<void, Error>> {
    if (!this.tasks.has(fileName)) {
      return Promise.resolve(err(new TaskNotFoundError(fileName)));
    }

    this.tasks.delete(fileName);
    return Promise.resolve(ok(undefined));
  }

  searchTasks(query: string, _options?: ListTaskOptions): Promise<Result<TaskInfo[], Error>> {
    const results = Array.from(this.tasks.values()).filter(
      (task) =>
        task.title.toLowerCase().includes(query.toLowerCase()) ||
        task.body.toLowerCase().includes(query.toLowerCase()),
    );
    return Promise.resolve(ok(results));
  }
}
