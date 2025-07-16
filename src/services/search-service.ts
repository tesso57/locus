import { TaskInfo } from "./task-service.ts";
import { Result } from "../utils/result.ts";
import { RepoInfo } from "../types.ts";

/**
 * Options for searching tasks
 */
export interface SearchOptions {
  /**
   * Search in all repositories
   */
  all?: boolean;

  /**
   * Filter by status
   */
  status?: string;

  /**
   * Filter by priority
   */
  priority?: string;

  /**
   * Filter by tags
   */
  tags?: string[];

  /**
   * Search in file names
   */
  searchFileName?: boolean;

  /**
   * Search in titles
   */
  searchTitle?: boolean;

  /**
   * Search in body content
   */
  searchBody?: boolean;

  /**
   * Search in tags
   */
  searchTags?: boolean;

  /**
   * Case-insensitive search
   */
  ignoreCase?: boolean;
}

/**
 * Service for searching tasks
 */
export interface SearchService {
  /**
   * Search for markdown files by query
   */
  searchMarkdownFiles(
    query: string,
    repoInfo?: RepoInfo | null,
    options?: SearchOptions,
  ): Promise<Result<string[], Error>>;

  /**
   * Search tasks by query with detailed results
   */
  searchTasks(
    query: string,
    repoInfo?: RepoInfo | null,
    options?: SearchOptions,
  ): Promise<Result<TaskInfo[], Error>>;

  /**
   * Check if a file name matches the search query
   */
  isFileNameMatch(fileName: string, query: string, ignoreCase?: boolean): boolean;

  /**
   * Check if a title matches the search query
   */
  isTitleMatch(title: string, query: string, ignoreCase?: boolean): boolean;

  /**
   * Check if body content matches the search query
   */
  isBodyMatch(body: string, query: string, ignoreCase?: boolean): boolean;

  /**
   * Check if tags match the search query
   */
  isTagsMatch(tags: string[], query: string, ignoreCase?: boolean): boolean;
}
