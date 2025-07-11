import { Result } from "../utils/result.ts";
import { FrontMatter, RepoInfo } from "../types.ts";

/**
 * Represents a task file with metadata
 */
export interface TaskInfo {
  fileName: string;
  title: string;
  status: string;
  priority: string;
  tags: string[];
  created: string;
  path: string;
  repository?: string;
  frontmatter: FrontMatter;
  body: string;
}

/**
 * Options for listing tasks
 */
export interface ListTaskOptions {
  status?: string;
  priority?: string;
  tags?: string[];
  all?: boolean;
  repoInfo?: RepoInfo | null;
}

/**
 * Options for creating a task
 */
export interface CreateTaskOptions {
  title: string;
  body?: string;
  tags?: string[];
  priority?: string;
  status?: string;
  repoInfo?: RepoInfo | null;
}

/**
 * Options for updating a task
 */
export interface UpdateTaskOptions {
  fileName: string;
  title?: string;
  body?: string;
  frontmatter?: Partial<FrontMatter>;
  repoInfo?: RepoInfo | null;
}

/**
 * Task service interface for managing tasks
 */
export interface TaskService {
  /**
   * List tasks based on options
   */
  listTasks(options: ListTaskOptions): Promise<Result<TaskInfo[], Error>>;

  /**
   * Get a specific task by file name
   */
  getTask(fileName: string, repoInfo?: RepoInfo | null): Promise<Result<TaskInfo, Error>>;

  /**
   * Create a new task
   */
  createTask(options: CreateTaskOptions): Promise<Result<string, Error>>;

  /**
   * Update an existing task
   */
  updateTask(options: UpdateTaskOptions): Promise<Result<void, Error>>;

  /**
   * Delete a task
   */
  deleteTask(fileName: string, repoInfo?: RepoInfo | null): Promise<Result<void, Error>>;

  /**
   * Search tasks by content
   */
  searchTasks(query: string, options?: ListTaskOptions): Promise<Result<TaskInfo[], Error>>;
}
