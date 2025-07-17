import { join } from "@std/path";
import { ensureDir } from "@std/fs";
import { Config, RepoInfo } from "../types.ts";
import { err, ok, Result } from "../utils/result.ts";
import { FileSystemError, getErrorMessage } from "../utils/errors.ts";
import { getDefaultConfigDir, getHomeDir } from "../utils/platform.ts";

/**
 * Service interface for resolving file system paths.
 * 
 * Handles path resolution for task files, configuration files, and directories.
 * Supports Git-aware directory structures where tasks are organized by repository.
 * All methods return Result types for explicit error handling.
 * 
 * @since 0.1.0
 */
export interface PathResolver {
  /**
   * Gets the base directory where all tasks are stored.
   * 
   * @returns Result containing the expanded base directory path or an error
   * 
   * @example
   * ```typescript
   * const result = pathResolver.getBaseDir();
   * if (result.ok) {
   *   console.log(`Tasks stored in: ${result.value}`);
   *   // e.g., "/home/user/locus"
   * }
   * ```
   */
  getBaseDir(): Result<string, Error>;

  /**
   * Gets the task directory for a specific repository.
   * 
   * Creates the directory if it doesn't exist. If repoInfo is provided and Git
   * username extraction is enabled, returns a repository-specific directory.
   * Otherwise, returns the base directory.
   * 
   * @param repoInfo - Repository information (owner and name) or null
   * @returns Promise resolving to Result with the task directory path
   * 
   * @example
   * ```typescript
   * // With repository info
   * const result = await pathResolver.getTaskDir({ owner: "alice", repo: "project" });
   * // Returns: "/home/user/locus/alice/project"
   * 
   * // Without repository info
   * const result = await pathResolver.getTaskDir(null);
   * // Returns: "/home/user/locus"
   * ```
   */
  getTaskDir(repoInfo: RepoInfo | null): Promise<Result<string, Error>>;

  /**
   * Gets the full path for a specific task file.
   * 
   * @param fileName - The task file name (e.g., "2024-01-15-task.md")
   * @param repoInfo - Repository information or null
   * @returns Promise resolving to Result with the full file path
   * 
   * @example
   * ```typescript
   * const result = await pathResolver.getTaskFilePath(
   *   "2024-01-15-meeting-notes.md",
   *   { owner: "alice", repo: "project" }
   * );
   * // Returns: "/home/user/locus/alice/project/2024-01-15-meeting-notes.md"
   * ```
   */
  getTaskFilePath(fileName: string, repoInfo: RepoInfo | null): Promise<Result<string, Error>>;

  /**
   * Gets the path to the configuration file.
   * 
   * @returns Result containing the config file path (typically "~/.config/locus/settings.yml")
   * 
   * @example
   * ```typescript
   * const result = pathResolver.getConfigFilePath();
   * if (result.ok) {
   *   console.log(`Config file: ${result.value}`);
   * }
   * ```
   */
  getConfigFilePath(): Result<string, Error>;

  /**
   * Gets the configuration directory path.
   * 
   * @returns Result containing the config directory path (typically "~/.config/locus")
   * 
   * @example
   * ```typescript
   * const result = pathResolver.getConfigDir();
   * if (result.ok) {
   *   console.log(`Config directory: ${result.value}`);
   * }
   * ```
   */
  getConfigDir(): Result<string, Error>;

  /**
   * Resolves a task file from a partial name.
   * 
   * Searches for task files matching the partial name using various strategies:
   * - Exact match (with or without .md extension)
   * - Partial match at the beginning of the filename
   * - Match after date prefix (e.g., "task" matches "2024-01-15-task-abc123.md")
   * 
   * @param partialName - Partial file name to search for
   * @param repoInfo - Repository information or null
   * @returns Promise resolving to Result with the full path of the matching file
   * 
   * @example
   * ```typescript
   * // Find task by partial name
   * const result = await pathResolver.resolveTaskFile("meeting", repoInfo);
   * // Might return: "/home/user/locus/alice/project/2024-01-15-meeting-notes-abc123.md"
   * ```
   */
  resolveTaskFile(
    partialName: string,
    repoInfo: RepoInfo | null,
  ): Promise<Result<string, Error>>;
}

/**
 * Default implementation of the PathResolver interface.
 * 
 * This implementation:
 * - Expands tilde (~) in paths to the user's home directory
 * - Creates directories as needed when resolving paths
 * - Supports Git-aware directory structures based on configuration
 * - Provides fuzzy matching for task file resolution
 * 
 * @example
 * ```typescript
 * const config = await loadConfig();
 * const pathResolver = new DefaultPathResolver(config.value);
 * const taskDir = await pathResolver.getTaskDir(repoInfo);
 * ```
 */
export class DefaultPathResolver implements PathResolver {
  constructor(private config: Config) {}

  getBaseDir(): Result<string, Error> {
    try {
      const baseDir = this.expandTilde(this.config.task_directory);
      return ok(baseDir);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      return err(new FileSystemError(`Failed to resolve base directory: ${message}`));
    }
  }

  async getTaskDir(repoInfo: RepoInfo | null): Promise<Result<string, Error>> {
    const baseDirResult = this.getBaseDir();
    if (!baseDirResult.ok) {
      return baseDirResult;
    }

    const baseDir = baseDirResult.value;

    if (!repoInfo || !this.config.git.extract_username || !this.config.git.username_from_remote) {
      try {
        await ensureDir(baseDir);
        return ok(baseDir);
      } catch (error: unknown) {
        const message = getErrorMessage(error);
        return err(new FileSystemError(`Failed to create base directory: ${message}`));
      }
    }

    const taskDir = join(baseDir, repoInfo.owner, repoInfo.repo);

    try {
      await ensureDir(taskDir);
      return ok(taskDir);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      return err(
        new FileSystemError(`Failed to create task directory: ${message}`),
      );
    }
  }

  async getTaskFilePath(
    fileName: string,
    repoInfo: RepoInfo | null,
  ): Promise<Result<string, Error>> {
    const taskDirResult = await this.getTaskDir(repoInfo);
    if (!taskDirResult.ok) {
      return taskDirResult;
    }

    const filePath = join(taskDirResult.value, fileName);
    return ok(filePath);
  }

  getConfigFilePath(): Result<string, Error> {
    const configDirResult = this.getConfigDir();
    if (!configDirResult.ok) {
      return configDirResult;
    }

    return ok(join(configDirResult.value, "settings.yml"));
  }

  getConfigDir(): Result<string, Error> {
    try {
      const configHome = getDefaultConfigDir();
      return ok(join(configHome, "locus"));
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      return err(new FileSystemError(`Failed to resolve config directory: ${message}`));
    }
  }

  async resolveTaskFile(
    partialName: string,
    repoInfo: RepoInfo | null,
  ): Promise<Result<string, Error>> {
    const taskDirResult = await this.getTaskDir(repoInfo);
    if (!taskDirResult.ok) {
      return taskDirResult;
    }

    const taskDir = taskDirResult.value;
    const normalizedName = partialName.toLowerCase();

    try {
      for await (const entry of Deno.readDir(taskDir)) {
        if (!entry.isFile || !entry.name.endsWith(".md")) {
          continue;
        }

        const fileName = entry.name.toLowerCase();

        // Exact match (with or without .md)
        if (fileName === normalizedName || fileName === `${normalizedName}.md`) {
          return ok(join(taskDir, entry.name));
        }

        // Partial match
        if (fileName.includes(normalizedName)) {
          return ok(join(taskDir, entry.name));
        }
      }

      // If not found, return the path where it would be
      const fileName = partialName.endsWith(".md") ? partialName : `${partialName}.md`;
      return ok(join(taskDir, fileName));
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      return err(new FileSystemError(`Failed to resolve task file: ${message}`));
    }
  }

  private expandTilde(path: string): string {
    if (path.startsWith("~/") || path === "~") {
      const home = getHomeDir();
      if (!home) {
        throw new Error(
          Deno.build.os === "windows"
            ? "USERPROFILE environment variable is not set"
            : "HOME environment variable is not set",
        );
      }
      return path.replace(/^~/, home);
    }
    return path;
  }
}
