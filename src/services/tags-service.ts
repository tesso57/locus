import { Result } from "../utils/result.ts";
import { FrontMatter, RepoInfo } from "../types.ts";

/**
 * Tag information for listing
 */
export interface TagInfo {
  fileName: string;
  path: string;
  frontmatter: FrontMatter;
}

/**
 * Options for listing tags
 */
export interface ListTagsOptions {
  fileName?: string;
  repoInfo?: RepoInfo | null;
}

/**
 * Options for getting a tag
 */
export interface GetTagOptions {
  fileName: string;
  property: string;
  repoInfo?: RepoInfo | null;
}

/**
 * Options for setting a tag
 */
export interface SetTagOptions {
  fileName: string;
  property: string;
  value: unknown;
  repoInfo?: RepoInfo | null;
}

/**
 * Options for removing a tag
 */
export interface RemoveTagOptions {
  fileName: string;
  property: string;
  repoInfo?: RepoInfo | null;
}

/**
 * Options for clearing tags
 */
export interface ClearTagsOptions {
  fileName: string;
  repoInfo?: RepoInfo | null;
}

/**
 * Tags service interface for managing task metadata
 */
export interface TagsService {
  /**
   * List all task files or properties of a specific file
   */
  listTags(options: ListTagsOptions): Promise<Result<TagInfo[], Error>>;

  /**
   * Get a specific property from a task file
   */
  getTag(options: GetTagOptions): Promise<Result<unknown, Error>>;

  /**
   * Set a property on a task file
   */
  setTag(options: SetTagOptions): Promise<Result<void, Error>>;

  /**
   * Remove a property from a task file
   */
  removeTag(options: RemoveTagOptions): Promise<Result<void, Error>>;

  /**
   * Clear all properties from a task file
   */
  clearTags(options: ClearTagsOptions): Promise<Result<void, Error>>;

  /**
   * Get all task files from base directory
   */
  getAllTaskFiles(): Promise<Result<TagInfo[], Error>>;
}
