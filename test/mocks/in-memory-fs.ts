import { err, ok, Result } from "../../src/utils/result.ts";
import { FileAlreadyExistsError, FileNotFoundError } from "../../src/utils/errors.ts";
import { FileSystem } from "../../src/services/file-system.ts";
import * as path from "@std/path";

interface FileEntry {
  content: string;
  isDirectory: boolean;
}

/**
 * In-memory file system for testing
 */
export class InMemoryFileSystem implements FileSystem {
  private files: Map<string, FileEntry> = new Map();

  constructor() {
    // Initialize with home directory
    const home = this.getHome();
    this.files.set(this.canonical(home), { content: "", isDirectory: true });
  }

  getHome(): string {
    // Use platform-appropriate home directory for tests
    if (Deno.build.os === "windows") {
      return path.join("C:", "Users", "test");
    }
    return "/home/test";
  }

  /**
   * Normalize path for consistent lookup in the in-memory filesystem
   * Uses the native path separator for the current platform
   */
  private canonical(p: string): string {
    // Normalize the path using the platform's native separator
    const normalized = path.normalize(p);
    // Ensure no trailing separator (except for root)
    const sep = path.SEPARATOR;
    return normalized.endsWith(sep) && normalized.length > 1 ? normalized.slice(0, -1) : normalized;
  }

  readTextFile(filePath: string): Promise<Result<string, Error>> {
    const canonicalPath = this.canonical(filePath);
    const file = this.files.get(canonicalPath);
    if (!file) {
      return Promise.resolve(err(new FileNotFoundError(filePath)));
    }
    if (file.isDirectory) {
      return Promise.resolve(err(new Error(`${filePath} is a directory`)));
    }
    return Promise.resolve(ok(file.content));
  }

  async writeTextFile(filePath: string, content: string): Promise<Result<void, Error>> {
    const canonicalPath = this.canonical(filePath);
    // Ensure parent directory exists
    const parentPath = this.getParentPath(canonicalPath);
    if (parentPath) {
      const parentExistsResult = await this.exists(parentPath);
      if (!parentExistsResult.ok || !parentExistsResult.value) {
        const mkdirResult = await this.mkdir(parentPath, true);
        if (!mkdirResult.ok) {
          return mkdirResult;
        }
      }
    }

    this.files.set(canonicalPath, { content, isDirectory: false });
    return ok(undefined);
  }

  exists(filePath: string): Promise<Result<boolean, Error>> {
    try {
      const canonicalPath = this.canonical(filePath);
      return Promise.resolve(ok(this.files.has(canonicalPath)));
    } catch (error: unknown) {
      return Promise.resolve(err(error instanceof Error ? error : new Error(String(error))));
    }
  }

  async mkdir(dirPath: string, recursive = false): Promise<Result<void, Error>> {
    const canonicalPath = this.canonical(dirPath);
    const existsResult = await this.exists(canonicalPath);
    if (!existsResult.ok) {
      return err(existsResult.error);
    }
    if (existsResult.value) {
      const file = this.files.get(canonicalPath)!;
      if (!file.isDirectory) {
        return err(new Error(`${dirPath} already exists and is not a directory`));
      }
      return ok(undefined);
    }

    if (recursive) {
      // Use path.dirname and path.basename to correctly handle platform paths
      const segments: string[] = [];
      let current = canonicalPath;
      while (current && current !== path.dirname(current)) {
        segments.unshift(path.basename(current));
        current = path.dirname(current);
      }
      
      // Build path incrementally
      let currentPath = current || (Deno.build.os === "windows" ? canonicalPath.substring(0, 3) : "/");
      for (const segment of segments) {
        currentPath = path.join(currentPath, segment);
        const currentCanonical = this.canonical(currentPath);
        const existsResult = await this.exists(currentCanonical);
        if (!existsResult.ok || !existsResult.value) {
          this.files.set(currentCanonical, { content: "", isDirectory: true });
        }
      }
    } else {
      const parentPath = this.getParentPath(canonicalPath);
      if (parentPath) {
        const parentExistsResult = await this.exists(parentPath);
        if (!parentExistsResult.ok || !parentExistsResult.value) {
          return err(new Error(`Parent directory does not exist: ${parentPath}`));
        }
      }
      this.files.set(canonicalPath, { content: "", isDirectory: true });
    }

    return ok(undefined);
  }

  async *readDirAsyncIterable(p: string): AsyncIterable<Deno.DirEntry> {
    const canonicalPath = this.canonical(p);
    const dir = this.files.get(canonicalPath);
    if (!dir || !dir.isDirectory) {
      return;
    }

    const sep = path.SEPARATOR;
    const pathWithSep = canonicalPath.endsWith(sep) ? canonicalPath : canonicalPath + sep;
    const entries = new Set<string>();

    for (const [filePath] of this.files) {
      if (filePath.startsWith(pathWithSep) && filePath !== canonicalPath) {
        const relativePath = filePath.slice(pathWithSep.length);
        const firstSep = relativePath.indexOf(sep);
        const entry = firstSep === -1 ? relativePath : relativePath.slice(0, firstSep);
        if (!entries.has(entry)) {
          entries.add(entry);
          const fullPath = path.join(canonicalPath, entry);
          const fileEntry = this.files.get(this.canonical(fullPath));
          yield {
            name: entry,
            isFile: fileEntry ? !fileEntry.isDirectory : false,
            isDirectory: fileEntry ? fileEntry.isDirectory : false,
            isSymlink: false,
          };
        }
      }
    }
  }

  readDir(dirPath: string): Promise<Result<AsyncIterable<Deno.DirEntry>, Error>> {
    const canonicalPath = this.canonical(dirPath);
    const dir = this.files.get(canonicalPath);
    if (!dir) {
      return Promise.resolve(err(new FileNotFoundError(dirPath)));
    }
    if (!dir.isDirectory) {
      return Promise.resolve(err(new Error(`${dirPath} is not a directory`)));
    }
    return Promise.resolve(ok(this.readDirAsyncIterable(dirPath)));
  }

  // Old readDir method for backwards compatibility
  readDirAsList(dirPath: string): Promise<Result<string[], Error>> {
    const canonicalPath = this.canonical(dirPath);
    const dir = this.files.get(canonicalPath);
    if (!dir) {
      return Promise.resolve(err(new FileNotFoundError(dirPath)));
    }
    if (!dir.isDirectory) {
      return Promise.resolve(err(new Error(`${dirPath} is not a directory`)));
    }

    const entries: string[] = [];
    const sep = path.SEPARATOR;
    const pathWithSep = canonicalPath.endsWith(sep) ? canonicalPath : canonicalPath + sep;

    for (const [filePath] of this.files) {
      if (filePath.startsWith(pathWithSep) && filePath !== canonicalPath) {
        const relativePath = filePath.slice(pathWithSep.length);
        const firstSep = relativePath.indexOf(sep);
        const entry = firstSep === -1 ? relativePath : relativePath.slice(0, firstSep);
        if (!entries.includes(entry)) {
          entries.push(entry);
        }
      }
    }

    return Promise.resolve(ok(entries));
  }

  async remove(filePath: string): Promise<Result<void, Error>> {
    const canonicalPath = this.canonical(filePath);
    const existsResult = await this.exists(canonicalPath);
    if (!existsResult.ok || !existsResult.value) {
      return err(new FileNotFoundError(filePath));
    }
    this.files.delete(canonicalPath);
    return ok(undefined);
  }

  // Additional helper methods for FileSystem interface

  stat(filePath: string): Promise<Result<Deno.FileInfo, Error>> {
    const canonicalPath = this.canonical(filePath);
    const file = this.files.get(canonicalPath);
    if (!file) {
      return Promise.resolve(err(new FileNotFoundError(filePath)));
    }

    const fileInfo: Deno.FileInfo = {
      isFile: !file.isDirectory,
      isDirectory: file.isDirectory,
      isSymlink: false,
      size: file.content.length,
      mtime: new Date(),
      atime: new Date(),
      birthtime: new Date(),
      ctime: null, // Add missing ctime property
      dev: 0,
      ino: 0,
      mode: 0,
      nlink: 0,
      uid: 0,
      gid: 0,
      rdev: 0,
      blksize: 0,
      blocks: 0,
      isBlockDevice: false,
      isCharDevice: false,
      isFifo: false,
      isSocket: false,
    };

    return Promise.resolve(ok(fileInfo));
  }

  clear(): void {
    this.files.clear();
    const home = this.getHome();
    this.files.set(this.canonical(home), { content: "", isDirectory: true });
  }

  private getParentPath(p: string): string | null {
    const parent = path.dirname(p);
    // Check if we're at the root
    if (parent === p) return null;
    return parent;
  }

  readFile(filePath: string): Promise<Result<string, Error>> {
    return this.readTextFile(filePath);
  }

  writeFile(filePath: string, content: string): Promise<Result<void, Error>> {
    return this.writeTextFile(filePath, content);
  }

  makeDir(dirPath: string, options?: { recursive?: boolean }): Promise<Result<void, Error>> {
    return this.mkdir(dirPath, options?.recursive);
  }

  ensureMarkdownExtension(fileName: string): string {
    return fileName.endsWith(".md") ? fileName : `${fileName}.md`;
  }

  validateFileName(fileName: string): Result<void, Error> {
    if (fileName.includes("/") || fileName.includes("\\")) {
      return err(new Error("ファイル名にパス区切り文字（/や\\）を含めることはできません"));
    }

    if (fileName.includes("..")) {
      return err(new Error("ファイル名に相対パス（..）を含めることはできません"));
    }

    if (fileName.length === 0) {
      return err(new Error("ファイル名が空です"));
    }

    if (fileName.length > 255) {
      return err(new Error("ファイル名が長すぎます（最大255文字）"));
    }

    // Check for invalid characters
    // deno-lint-ignore no-control-regex
    const invalidChars = /[<>:"|?*\x00-\x1f]/;
    if (invalidChars.test(fileName)) {
      return err(new Error("ファイル名に無効な文字が含まれています"));
    }

    return ok(undefined);
  }
}
