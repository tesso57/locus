import { Result } from "../utils/result.ts";
import { FrontMatter, RepoInfo } from "../types.ts";

/**
 * Represents a task file with its complete metadata and content.
 * 
 * Contains all information about a task including its file properties,
 * frontmatter metadata, and markdown body content.
 * 
 * @since 0.1.0
 */
export interface TaskInfo {
  /** The filename of the task (e.g., "2024-01-15-meeting-notes-abc123.md") */
  fileName: string;
  
  /** The task title extracted from the first H1 heading or filename */
  title: string;
  
  /** Current status of the task (e.g., "todo", "in-progress", "done") */
  status: string;
  
  /** Priority level (e.g., "high", "medium", "low") */
  priority: string;
  
  /** Array of tags associated with the task */
  tags: string[];
  
  /** ISO 8601 timestamp when the task was created */
  created: string;
  
  /** Full file path to the task file */
  path: string;
  
  /** Repository identifier in "owner/repo" format if Git-aware */
  repository?: string;
  
  /** Complete frontmatter data from the task file */
  frontmatter: FrontMatter;
  
  /** Markdown body content (without frontmatter) */
  body: string;
}

/**
 * Options for filtering and listing tasks.
 * 
 * All fields are optional and act as filters when provided.
 * Multiple filters are combined with AND logic.
 * 
 * @since 0.1.0
 */
export interface ListTaskOptions {
  /** Filter by task status (e.g., "todo", "done") */
  status?: string;
  
  /** Filter by priority level (e.g., "high", "medium", "low") */
  priority?: string;
  
  /** Filter by tags - tasks must have ALL specified tags */
  tags?: string[];
  
  /** If true, list tasks from all repositories, not just current */
  all?: boolean;
  
  /** Repository info to filter tasks by specific repository */
  repoInfo?: RepoInfo | null;
}

/**
 * Options for creating a new task.
 * 
 * Only title is required. Other fields will use defaults from configuration
 * if not provided.
 * 
 * @since 0.1.0
 */
export interface CreateTaskOptions {
  /** Task title (required) - will be used as H1 heading in markdown */
  title: string;
  
  /** Optional task body content in markdown format */
  body?: string;
  
  /** Tags to assign to the task */
  tags?: string[];
  
  /** Priority level (defaults to config value) */
  priority?: string;
  
  /** Initial status (defaults to config value) */
  status?: string;
  
  /** Repository info for determining task location */
  repoInfo?: RepoInfo | null;
}

/**
 * Options for updating an existing task.
 * 
 * Only fileName is required. Other fields will only be updated if provided.
 * 
 * @since 0.1.0
 */
export interface UpdateTaskOptions {
  /** File name of the task to update (required) */
  fileName: string;
  
  /** New title for the task */
  title?: string;
  
  /** New body content for the task */
  body?: string;
  
  /** Partial frontmatter updates (merged with existing) */
  frontmatter?: Partial<FrontMatter>;
  
  /** Repository info for locating the task */
  repoInfo?: RepoInfo | null;
}

/**
 * Service interface for managing task files.
 * 
 * Provides CRUD operations for tasks, as well as listing and searching capabilities.
 * All operations are Git-aware and can work with repository-specific task directories.
 * All methods return Result types for explicit error handling.
 * 
 * @since 0.1.0
 */
export interface TaskService {
  /**
   * Lists tasks based on the provided filter options.
   * 
   * @param options - Filtering options for task listing
   * @returns Promise resolving to Result with array of matching tasks
   * 
   * @example
   * ```typescript
   * // List all high-priority TODO tasks
   * const result = await taskService.listTasks({
   *   status: "todo",
   *   priority: "high"
   * });
   * 
   * if (result.ok) {
   *   console.log(`Found ${result.value.length} tasks`);
   * }
   * ```
   */
  listTasks(options: ListTaskOptions): Promise<Result<TaskInfo[], Error>>;

  /**
   * Retrieves a specific task by its file name.
   * 
   * @param fileName - Name of the task file (with or without .md extension)
   * @param repoInfo - Optional repository information for locating the task
   * @returns Promise resolving to Result with the task information
   * 
   * @example
   * ```typescript
   * const result = await taskService.getTask("meeting-notes", repoInfo);
   * if (result.ok) {
   *   console.log(`Task: ${result.value.title}`);
   *   console.log(`Status: ${result.value.status}`);
   * }
   * ```
   */
  getTask(fileName: string, repoInfo?: RepoInfo | null): Promise<Result<TaskInfo, Error>>;

  /**
   * Creates a new task with the specified options.
   * 
   * @param options - Task creation options including title and metadata
   * @returns Promise resolving to Result with the created file path
   * 
   * @example
   * ```typescript
   * const result = await taskService.createTask({
   *   title: "Implement new feature",
   *   tags: ["feature", "backend"],
   *   priority: "high",
   *   body: "## Description\n\nImplement user authentication..."
   * });
   * 
   * if (result.ok) {
   *   console.log(`Task created: ${result.value}`);
   * }
   * ```
   */
  createTask(options: CreateTaskOptions): Promise<Result<string, Error>>;

  /**
   * Updates an existing task with new content or metadata.
   * 
   * @param options - Update options including file name and fields to update
   * @returns Promise resolving to Result indicating success or failure
   * 
   * @example
   * ```typescript
   * const result = await taskService.updateTask({
   *   fileName: "implement-auth.md",
   *   frontmatter: { status: "in-progress" },
   *   body: "## Progress\n\nCompleted OAuth integration..."
   * });
   * ```
   */
  updateTask(options: UpdateTaskOptions): Promise<Result<void, Error>>;

  /**
   * Deletes a task file.
   * 
   * @param fileName - Name of the task file to delete
   * @param repoInfo - Optional repository information for locating the task
   * @returns Promise resolving to Result indicating success or failure
   * 
   * @example
   * ```typescript
   * const result = await taskService.deleteTask("old-task.md", repoInfo);
   * if (result.ok) {
   *   console.log("Task deleted successfully");
   * }
   * ```
   */
  deleteTask(fileName: string, repoInfo?: RepoInfo | null): Promise<Result<void, Error>>;

  /**
   * Searches tasks by content using full-text search.
   * 
   * @param query - Search query string
   * @param options - Optional filters to apply on search results
   * @returns Promise resolving to Result with array of matching tasks
   * 
   * @example
   * ```typescript
   * // Search for tasks mentioning "authentication"
   * const result = await taskService.searchTasks("authentication", {
   *   status: "todo"
   * });
   * 
   * if (result.ok) {
   *   result.value.forEach(task => {
   *     console.log(`- ${task.title}`);
   *   });
   * }
   * ```
   */
  searchTasks(query: string, options?: ListTaskOptions): Promise<Result<TaskInfo[], Error>>;
}
