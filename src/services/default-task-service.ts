import { err, ok, Result } from "../utils/result.ts";
import { join } from "@std/path";
import { parse, stringify } from "@std/yaml";
import {
  CreateTaskOptions,
  ListTaskOptions,
  TaskInfo,
  TaskService,
  UpdateTaskOptions,
} from "./task-service.ts";
import { PathResolver } from "./path-resolver.ts";
import { GitService } from "./git-service.ts";
import { FileSystem } from "./file-system.ts";
import { FileNameService } from "./filename-service.ts";
import { MarkdownService } from "./markdown-service.ts";
import { Config, FrontMatter, ParsedMarkdown, RepoInfo } from "../types.ts";
import {
  FileAlreadyExistsError,
  FileNotFoundError,
  FileSystemError,
  getErrorMessage,
  TaskNotFoundError,
} from "../utils/errors.ts";

/**
 * Default implementation of TaskService
 */
export class DefaultTaskService implements TaskService {
  constructor(
    private pathResolver: PathResolver,
    private gitService: GitService,
    private config: Config,
    private fileSystem: FileSystem,
    private fileNameService: FileNameService,
    private markdownService: MarkdownService,
  ) {}

  async listTasks(options: ListTaskOptions): Promise<Result<TaskInfo[], Error>> {
    try {
      const tasks: TaskInfo[] = [];

      if (options.all) {
        const baseDirResult = this.pathResolver.getBaseDir();
        if (!baseDirResult.ok) {
          return err(baseDirResult.error);
        }

        const tasksResult = await this.collectTasksRecursively(baseDirResult.value);
        if (!tasksResult.ok) {
          return err(tasksResult.error);
        }

        // Apply filters
        const filteredTasks = this.filterTasks(tasksResult.value, options);
        return ok(filteredTasks);
      } else {
        const repoInfo = options.repoInfo ?? null;
        const taskDirResult = await this.pathResolver.getTaskDir(repoInfo);
        if (!taskDirResult.ok) {
          return err(taskDirResult.error);
        }

        const tasksResult = await this.collectTasksFromDir(taskDirResult.value);
        if (!tasksResult.ok) {
          return err(tasksResult.error);
        }

        // Apply filters
        const filteredTasks = this.filterTasks(tasksResult.value, options);
        return ok(filteredTasks);
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      return err(new FileSystemError(`Failed to list tasks: ${message}`));
    }
  }

  async getTask(fileName: string, repoInfo?: RepoInfo | null): Promise<Result<TaskInfo, Error>> {
    const filePathResult = await this.pathResolver.resolveTaskFile(fileName, repoInfo ?? null);
    if (!filePathResult.ok) {
      return err(filePathResult.error);
    }

    const filePath = filePathResult.value;

    try {
      const existsResult = await this.fileSystem.exists(filePath);
      if (!existsResult.ok || !existsResult.value) {
        return err(new TaskNotFoundError(fileName));
      }

      const contentResult = await this.fileSystem.readTextFile(filePath);
      if (!contentResult.ok) {
        return err(contentResult.error);
      }

      const parseResult = this.markdownService.parseMarkdown(contentResult.value);
      if (!parseResult.ok) {
        return err(parseResult.error);
      }
      const { frontmatter, body } = parseResult.value;

      if (!frontmatter) {
        return err(new FileSystemError(`Invalid task file: ${fileName}`));
      }

      const titleResult = this.markdownService.extractTitle(body);
      const title = titleResult.ok && titleResult.value
        ? titleResult.value
        : fileName.replace(/\.md$/, "");
      const relativePath = this.getRelativePath(filePath);
      const repository = this.extractRepository(relativePath, repoInfo);

      const taskInfo: TaskInfo = {
        fileName: filePath.split(/[/\\]/).pop() || "",
        title,
        status: frontmatter.status || "todo",
        priority: frontmatter.priority || "normal",
        tags: frontmatter.tags || [],
        created: frontmatter.created || frontmatter.date || "",
        path: relativePath,
        repository,
        frontmatter,
        body,
      };

      return ok(taskInfo);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      return err(new FileSystemError(`Failed to read task: ${message}`));
    }
  }

  async createTask(options: CreateTaskOptions): Promise<Result<string, Error>> {
    try {
      const repoInfo = options.repoInfo ?? null;
      const taskDirResult = await this.pathResolver.getTaskDir(repoInfo);
      if (!taskDirResult.ok) {
        return err(taskDirResult.error);
      }

      const fileNameResult = this.fileNameService.generateFileName(options.title);
      if (!fileNameResult.ok) {
        return err(fileNameResult.error);
      }
      const fileName = fileNameResult.value;
      const validateResult = this.markdownService.validateFileName(fileName);
      if (!validateResult.ok) {
        throw validateResult.error;
      }

      const taskPath = join(taskDirResult.value, fileName);

      const existsResult = await this.fileSystem.exists(taskPath);
      if (!existsResult.ok) {
        return err(existsResult.error);
      }
      if (existsResult.value) {
        return err(new FileAlreadyExistsError(taskPath));
      }

      const frontmatter: FrontMatter = {
        ...(this.config.defaults || {}),
      };

      if (options.tags && options.tags.length > 0) {
        frontmatter.tags = options.tags;
      } else if (!frontmatter.tags) {
        frontmatter.tags = [];
      }

      if (options.priority) {
        frontmatter.priority = options.priority;
      } else if (!frontmatter.priority) {
        frontmatter.priority = "normal";
      }

      if (options.status) {
        frontmatter.status = options.status;
      } else if (!frontmatter.status) {
        frontmatter.status = "todo";
      }

      const createResult = this.markdownService.createTaskMarkdown(
        options.title,
        options.body,
        frontmatter,
      );
      if (!createResult.ok) {
        return err(createResult.error);
      }
      const content = createResult.value;

      const writeResult = await this.fileSystem.writeTextFile(taskPath, content);
      if (!writeResult.ok) {
        return err(writeResult.error);
      }

      return ok(taskPath);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      return err(new FileSystemError(`Failed to create task: ${message}`));
    }
  }

  async updateTask(options: UpdateTaskOptions): Promise<Result<void, Error>> {
    const taskResult = await this.getTask(options.fileName, options.repoInfo);
    if (!taskResult.ok) {
      return err(taskResult.error);
    }

    const task = taskResult.value;
    const filePathResult = await this.pathResolver.resolveTaskFile(
      options.fileName,
      options.repoInfo ?? null,
    );
    if (!filePathResult.ok) {
      return err(filePathResult.error);
    }

    try {
      const updatedFrontmatter = {
        ...task.frontmatter,
        ...(options.frontmatter || {}),
      };

      const updatedBody = options.body !== undefined ? options.body : task.body;
      const generateResult = this.markdownService.generateMarkdown(updatedFrontmatter, updatedBody);
      if (!generateResult.ok) {
        return err(generateResult.error);
      }
      const content = generateResult.value;

      const writeResult = await this.fileSystem.writeTextFile(filePathResult.value, content);
      if (!writeResult.ok) {
        return err(writeResult.error);
      }

      return ok(undefined);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      return err(new FileSystemError(`Failed to update task: ${message}`));
    }
  }

  async deleteTask(fileName: string, repoInfo?: RepoInfo | null): Promise<Result<void, Error>> {
    const filePathResult = await this.pathResolver.resolveTaskFile(fileName, repoInfo ?? null);
    if (!filePathResult.ok) {
      return err(filePathResult.error);
    }

    try {
      const existsResult = await this.fileSystem.exists(filePathResult.value);
      if (!existsResult.ok || !existsResult.value) {
        return err(new TaskNotFoundError(fileName));
      }

      const removeResult = await this.fileSystem.remove(filePathResult.value);
      if (!removeResult.ok) {
        return err(removeResult.error);
      }
      return ok(undefined);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      return err(new FileSystemError(`Failed to delete task: ${message}`));
    }
  }

  async searchTasks(query: string, options?: ListTaskOptions): Promise<Result<TaskInfo[], Error>> {
    const allTasksResult = await this.listTasks(options || {});
    if (!allTasksResult.ok) {
      return err(allTasksResult.error);
    }

    const queryLower = query.toLowerCase();
    const matchedTasks = allTasksResult.value.filter((task: TaskInfo) => {
      return (
        task.title.toLowerCase().includes(queryLower) ||
        task.body.toLowerCase().includes(queryLower) ||
        task.tags.some((tag: string) => tag.toLowerCase().includes(queryLower))
      );
    });

    return ok(matchedTasks);
  }

  private async collectTasksRecursively(dir: string): Promise<Result<TaskInfo[], Error>> {
    const tasks: TaskInfo[] = [];

    try {
      for await (const entry of this.walkDirectory(dir)) {
        if (entry.isFile && entry.name.endsWith(".md")) {
          const filePath = entry.path;
          const taskResult = await this.readTaskFile(filePath);
          if (taskResult.ok) {
            tasks.push(taskResult.value);
          }
        }
      }

      return ok(tasks);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      return err(new FileSystemError(`Failed to collect tasks: ${message}`));
    }
  }

  private async collectTasksFromDir(dir: string): Promise<Result<TaskInfo[], Error>> {
    const tasks: TaskInfo[] = [];

    try {
      const dirResult = await this.fileSystem.readDir(dir);
      if (!dirResult.ok) {
        return err(dirResult.error);
      }

      for await (const entry of dirResult.value) {
        if (entry.isFile && entry.name.endsWith(".md")) {
          const filePath = join(dir, entry.name);
          const taskResult = await this.readTaskFile(filePath);
          if (taskResult.ok) {
            tasks.push(taskResult.value);
          }
        }
      }

      return ok(tasks);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      return err(new FileSystemError(`Failed to collect tasks from directory: ${message}`));
    }
  }

  private async readTaskFile(filePath: string): Promise<Result<TaskInfo, Error>> {
    try {
      const contentResult = await this.fileSystem.readTextFile(filePath);
      if (!contentResult.ok) {
        return err(contentResult.error);
      }

      const parseResult = this.markdownService.parseMarkdown(contentResult.value);
      if (!parseResult.ok) {
        return err(parseResult.error);
      }
      const { frontmatter, body } = parseResult.value;

      if (!frontmatter) {
        return err(new FileSystemError(`Invalid task file: ${filePath}`));
      }

      const fileName = filePath.split(/[/\\]/).pop() || "";
      const titleResult = this.markdownService.extractTitle(body);
      const title = titleResult.ok && titleResult.value
        ? titleResult.value
        : fileName.replace(/\.md$/, "");
      const relativePath = this.getRelativePath(filePath);
      const repository = this.extractRepositoryFromPath(relativePath);

      const taskInfo: TaskInfo = {
        fileName,
        title,
        status: frontmatter.status || "todo",
        priority: frontmatter.priority || "normal",
        tags: frontmatter.tags || [],
        created: frontmatter.created || frontmatter.date || "",
        path: relativePath,
        repository,
        frontmatter,
        body,
      };

      return ok(taskInfo);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      return err(new FileSystemError(`Failed to read task file ${filePath}: ${message}`));
    }
  }

  private filterTasks(tasks: TaskInfo[], options: ListTaskOptions): TaskInfo[] {
    return tasks.filter((task) => {
      if (options.status && task.status !== options.status) {
        return false;
      }

      if (options.priority && task.priority !== options.priority) {
        return false;
      }

      if (options.tags && options.tags.length > 0) {
        const hasTag = options.tags.some((tag: string) => task.tags.includes(tag));
        if (!hasTag) {
          return false;
        }
      }

      return true;
    });
  }

  private async *walkDirectory(dir: string): AsyncGenerator<{
    path: string;
    name: string;
    isFile: boolean;
    isDirectory: boolean;
  }> {
    const dirResult = await this.fileSystem.readDir(dir);
    if (!dirResult.ok) {
      return;
    }

    for await (const entry of dirResult.value) {
      const path = join(dir, entry.name);
      yield {
        path,
        name: entry.name,
        isFile: entry.isFile,
        isDirectory: entry.isDirectory,
      };

      if (entry.isDirectory) {
        yield* this.walkDirectory(path);
      }
    }
  }

  private getRelativePath(filePath: string): string {
    const baseDirResult = this.pathResolver.getBaseDir();
    if (!baseDirResult.ok) {
      return filePath;
    }

    const baseDir = baseDirResult.value;
    // Normalize paths to use forward slashes for comparison
    const normalizedFilePath = filePath.replace(/\\/g, "/");
    const normalizedBaseDir = baseDir.replace(/\\/g, "/");

    // If filePath starts with baseDir, remove it
    if (normalizedFilePath.startsWith(normalizedBaseDir)) {
      // Remove baseDir and any leading slash
      const relativePath = normalizedFilePath.slice(normalizedBaseDir.length);
      return relativePath.startsWith("/") ? relativePath.slice(1) : relativePath;
    }
    return normalizedFilePath;
  }

  private extractRepository(relativePath: string, repoInfo?: RepoInfo | null): string {
    if (repoInfo) {
      return `${repoInfo.owner}/${repoInfo.repo}`;
    }

    return this.extractRepositoryFromPath(relativePath);
  }

  private extractRepositoryFromPath(relativePath: string): string {
    const pathParts = relativePath.split("/");

    if (pathParts.length >= 2) {
      if (!pathParts[1].endsWith(".md")) {
        return `${pathParts[0]}/${pathParts[1]}`;
      }
    }

    return "default";
  }
}
