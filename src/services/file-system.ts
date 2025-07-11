import { Result } from "../utils/result.ts";

/**
 * File system interface for abstraction
 */
export interface FileSystem {
  /**
   * Read a text file
   */
  readTextFile(path: string): Promise<Result<string, Error>>;

  /**
   * Write a text file
   */
  writeTextFile(path: string, content: string): Promise<Result<void, Error>>;

  /**
   * Check if a file or directory exists
   */
  exists(path: string): Promise<boolean>;

  /**
   * Remove a file or directory
   */
  remove(path: string): Promise<Result<void, Error>>;

  /**
   * Read directory contents
   */
  readDir(path: string): Promise<Result<AsyncIterable<Deno.DirEntry>, Error>>;

  /**
   * Create a directory
   */
  mkdir(path: string, recursive?: boolean): Promise<Result<void, Error>>;

  /**
   * Get file information
   */
  stat(path: string): Promise<Result<Deno.FileInfo, Error>>;
}
