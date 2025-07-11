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

    const task = this.tasks.get(fileName);
    if (!task) {
      return Promise.resolve(err(new TaskNotFoundError(fileName)));
    }

    return Promise.resolve(ok(task));
  }

  createTask(options: CreateTaskOptions): Promise<Result<string, Error>> {
    const fileName = `${options.title.toLowerCase().replace(/\s+/g, "-")}.md`;
    const task: TaskInfo = {
      fileName,
      title: options.title,
      status: options.status || "todo",
      priority: options.priority || "normal",
      tags: options.tags || [],
      created: new Date().toISOString(),
      path: fileName,
      frontmatter: {
        status: options.status || "todo",
        priority: options.priority || "normal",
        tags: options.tags || [],
      },
      body: options.body || "",
    };

    this.tasks.set(fileName, task);
    return Promise.resolve(ok(fileName));
  }

  updateTask(options: UpdateTaskOptions): Promise<Result<void, Error>> {
    const task = this.tasks.get(options.fileName);
    if (!task) {
      return Promise.resolve(err(new TaskNotFoundError(options.fileName)));
    }

    if (options.title) task.title = options.title;
    if (options.body !== undefined) task.body = options.body;
    if (options.frontmatter) {
      task.frontmatter = { ...task.frontmatter, ...options.frontmatter };
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
