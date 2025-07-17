import { err, ok, Result } from "../utils/result.ts";
import { SearchOptions, SearchService } from "./search-service.ts";
import { TaskInfo, TaskService } from "./task-service.ts";
import { PathResolver } from "./path-resolver.ts";
import { FileSystem } from "./file-system.ts";
import { RepoInfo } from "../types.ts";
import { join } from "@std/path";
import { FileSystemError, getErrorMessage } from "../utils/errors.ts";

/**
 * Default implementation of SearchService
 */
export class DefaultSearchService implements SearchService {
  constructor(
    private taskService: TaskService,
    private pathResolver: PathResolver,
    private fileSystem: FileSystem,
  ) {}

  async searchMarkdownFiles(
    query: string,
    repoInfo?: RepoInfo | null,
    options?: SearchOptions,
  ): Promise<Result<string[], Error>> {
    try {
      const searchOpts = {
        searchFileName: true,
        searchTitle: true,
        searchBody: false,
        searchTags: false,
        ignoreCase: true,
        ...options,
      };

      // Get the search directory
      const dirResult = repoInfo
        ? await this.pathResolver.getTaskDir(repoInfo)
        : this.pathResolver.getBaseDir();

      if (!dirResult.ok) {
        return err(dirResult.error);
      }

      const found: string[] = [];
      await this.searchDirectory(dirResult.value, query, searchOpts, found);

      return ok(found);
    } catch (error) {
      return err(
        new FileSystemError(`Failed to search markdown files: ${getErrorMessage(error)}`),
      );
    }
  }

  async searchTasks(
    query: string,
    repoInfo?: RepoInfo | null,
    options?: SearchOptions,
  ): Promise<Result<TaskInfo[], Error>> {
    try {
      const searchOpts = {
        searchFileName: true,
        searchTitle: true,
        searchBody: true,
        searchTags: true,
        ignoreCase: true,
        ...options,
      };

      // Get all tasks
      const tasksResult = await this.taskService.listTasks({
        all: options?.all || !repoInfo,
        status: options?.status,
        priority: options?.priority,
        tags: options?.tags,
      });

      if (!tasksResult.ok) {
        return err(tasksResult.error);
      }

      // Filter tasks based on search criteria
      const matchedTasks = tasksResult.value.filter((task: TaskInfo) => {
        if (
          searchOpts.searchFileName &&
          this.isFileNameMatch(task.fileName, query, searchOpts.ignoreCase)
        ) {
          return true;
        }

        if (searchOpts.searchTitle && this.isTitleMatch(task.title, query, searchOpts.ignoreCase)) {
          return true;
        }

        if (
          searchOpts.searchBody && task.body &&
          this.isBodyMatch(task.body, query, searchOpts.ignoreCase)
        ) {
          return true;
        }

        if (searchOpts.searchTags && this.isTagsMatch(task.tags, query, searchOpts.ignoreCase)) {
          return true;
        }

        return false;
      });

      return ok(matchedTasks);
    } catch (error) {
      return err(
        new FileSystemError(`Failed to search tasks: ${getErrorMessage(error)}`),
      );
    }
  }

  isFileNameMatch(fileName: string, query: string, ignoreCase?: boolean): boolean {
    const searchTerm = ignoreCase ? query.toLowerCase() : query;
    const targetName = ignoreCase ? fileName.toLowerCase() : fileName;

    // Remove .md extension for comparison
    const nameWithoutExt = targetName.endsWith(".md") ? targetName.slice(0, -3) : targetName;
    const queryWithoutExt = searchTerm.endsWith(".md") ? searchTerm.slice(0, -3) : searchTerm;

    return nameWithoutExt.includes(queryWithoutExt);
  }

  isTitleMatch(title: string, query: string, ignoreCase?: boolean): boolean {
    const searchTerm = ignoreCase ? query.toLowerCase() : query;
    const targetTitle = ignoreCase ? title.toLowerCase() : title;

    return targetTitle.includes(searchTerm);
  }

  isBodyMatch(body: string, query: string, ignoreCase?: boolean): boolean {
    const searchTerm = ignoreCase ? query.toLowerCase() : query;
    const targetBody = ignoreCase ? body.toLowerCase() : body;

    return targetBody.includes(searchTerm);
  }

  isTagsMatch(tags: string[], query: string, ignoreCase?: boolean): boolean {
    const searchTerm = ignoreCase ? query.toLowerCase() : query;

    return tags.some((tag) => {
      const targetTag = ignoreCase ? tag.toLowerCase() : tag;
      return targetTag.includes(searchTerm);
    });
  }

  /**
   * Recursively search directory for matching files
   */
  private async searchDirectory(
    dir: string,
    query: string,
    options: SearchOptions,
    found: string[],
  ): Promise<void> {
    const entriesResult = await this.fileSystem.readDir(dir);
    if (!entriesResult.ok) {
      return; // Ignore directories we can't read
    }

    for await (const entry of entriesResult.value) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory) {
        await this.searchDirectory(fullPath, query, options, found);
      } else if (entry.isFile && entry.name.endsWith(".md")) {
        let matched = false;

        // Check filename match
        if (options.searchFileName) {
          matched = this.isFileNameMatch(entry.name, query, options.ignoreCase);
        }

        // Check title match if not already matched
        if (!matched && options.searchTitle) {
          const contentResult = await this.fileSystem.readTextFile(fullPath);
          if (contentResult.ok) {
            // Simple title extraction (looking for # Title)
            const lines = contentResult.value.split("\n");
            const titleLine = lines.find((line: string) => line.trim().startsWith("# "));
            if (titleLine) {
              const title = titleLine.trim().substring(2).trim();
              matched = this.isTitleMatch(title, query, options.ignoreCase);
            }
          }
        }

        if (matched) {
          found.push(fullPath);
        }
      }
    }
  }
}
