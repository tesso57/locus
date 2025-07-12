import { join } from "@std/path";
import { ensureDir } from "@std/fs";
import { Config, RepoInfo } from "../types.ts";
import { err, ok, Result } from "../utils/result.ts";
import { FileSystemError, getErrorMessage } from "../utils/errors.ts";

/**
 * Interface for path resolution
 */
export interface PathResolver {
  /**
   * Get the base locus directory
   */
  getBaseDir(): Result<string, Error>;

  /**
   * Get the task directory for a repository
   */
  getTaskDir(repoInfo: RepoInfo | null): Promise<Result<string, Error>>;

  /**
   * Get the path for a specific task file
   */
  getTaskFilePath(fileName: string, repoInfo: RepoInfo | null): Promise<Result<string, Error>>;

  /**
   * Get the configuration file path
   */
  getConfigFilePath(): Result<string, Error>;

  /**
   * Get the configuration directory
   */
  getConfigDir(): Result<string, Error>;

  /**
   * Resolve a task file from partial name
   */
  resolveTaskFile(
    partialName: string,
    repoInfo: RepoInfo | null,
  ): Promise<Result<string, Error>>;
}

/**
 * Default PathResolver implementation
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
      const configHome = Deno.env.get("XDG_CONFIG_HOME") ??
        join(Deno.env.get("HOME") || "", ".config");
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
      const home = Deno.env.get("HOME");
      if (!home) {
        throw new Error("HOME environment variable is not set");
      }
      return path.replace(/^~/, home);
    }
    return path;
  }
}
