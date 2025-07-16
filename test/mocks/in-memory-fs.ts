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
      return "C:\\Users\\test";
    }
    return "/home/test";
  }

  /**
   * Normalize path to use forward slashes consistently
   * This ensures cross-platform compatibility between Windows and Unix
   */
  private canonical(p: string): string {
    // Normalize the path and convert all backslashes to forward slashes
    const normalized = path.normalize(p).replace(/\\/g, "/");
    // Ensure no trailing slash (except for root)
    return normalized.endsWith("/") && normalized.length > 1 ? normalized.slice(0, -1) : normalized;
  }

  readTextFile(path: string): Promise<Result<string, Error>> {
    const canonicalPath = this.canonical(path);
    const file = this.files.get(canonicalPath);
    if (!file) {
      return Promise.resolve(err(new FileNotFoundError(path)));
    }
    if (file.isDirectory) {
      return Promise.resolve(err(new Error(`${path} is a directory`)));
    }
    return Promise.resolve(ok(file.content));
  }

  async writeTextFile(path: string, content: string): Promise<Result<void, Error>> {
    const canonicalPath = this.canonical(path);
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

  exists(path: string): Promise<Result<boolean, Error>> {
    try {
      const canonicalPath = this.canonical(path);
      return Promise.resolve(ok(this.files.has(canonicalPath)));
    } catch (error: unknown) {
      return Promise.resolve(err(error instanceof Error ? error : new Error(String(error))));
    }
  }

  async mkdir(path: string, recursive = false): Promise<Result<void, Error>> {
    const canonicalPath = this.canonical(path);
    const existsResult = await this.exists(canonicalPath);
    if (!existsResult.ok) {
      return err(existsResult.error);
    }
    if (existsResult.value) {
      const file = this.files.get(canonicalPath)!;
      if (!file.isDirectory) {
        return err(new Error(`${path} already exists and is not a directory`));
      }
      return ok(undefined);
    }

    if (recursive) {
      const parts = canonicalPath.split("/").filter(Boolean);
      let currentPath = "";
      for (const part of parts) {
        currentPath += "/" + part;
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

  async *readDirAsyncIterable(path: string): AsyncIterable<Deno.DirEntry> {
    const canonicalPath = this.canonical(path);
    const dir = this.files.get(canonicalPath);
    if (!dir || !dir.isDirectory) {
      return;
    }

    const pathWithSlash = canonicalPath.endsWith("/") ? canonicalPath : canonicalPath + "/";
    const entries = new Set<string>();

    for (const [filePath] of this.files) {
      if (filePath.startsWith(pathWithSlash) && filePath !== canonicalPath) {
        const relativePath = filePath.slice(pathWithSlash.length);
        const firstSlash = relativePath.indexOf("/");
        const entry = firstSlash === -1 ? relativePath : relativePath.slice(0, firstSlash);
        if (!entries.has(entry)) {
          entries.add(entry);
          const fullPath = this.canonical(pathWithSlash + entry);
          const fileEntry = this.files.get(fullPath);
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

  readDir(path: string): Promise<Result<AsyncIterable<Deno.DirEntry>, Error>> {
    const canonicalPath = this.canonical(path);
    const dir = this.files.get(canonicalPath);
    if (!dir) {
      return Promise.resolve(err(new FileNotFoundError(path)));
    }
    if (!dir.isDirectory) {
      return Promise.resolve(err(new Error(`${path} is not a directory`)));
    }
    return Promise.resolve(ok(this.readDirAsyncIterable(path)));
  }

  // Old readDir method for backwards compatibility
  readDirAsList(path: string): Promise<Result<string[], Error>> {
    const canonicalPath = this.canonical(path);
    const dir = this.files.get(canonicalPath);
    if (!dir) {
      return Promise.resolve(err(new FileNotFoundError(path)));
    }
    if (!dir.isDirectory) {
      return Promise.resolve(err(new Error(`${path} is not a directory`)));
    }

    const entries: string[] = [];
    const pathWithSlash = canonicalPath.endsWith("/") ? canonicalPath : canonicalPath + "/";

    for (const [filePath] of this.files) {
      if (filePath.startsWith(pathWithSlash) && filePath !== canonicalPath) {
        const relativePath = filePath.slice(pathWithSlash.length);
        const firstSlash = relativePath.indexOf("/");
        const entry = firstSlash === -1 ? relativePath : relativePath.slice(0, firstSlash);
        if (!entries.includes(entry)) {
          entries.push(entry);
        }
      }
    }

    return Promise.resolve(ok(entries));
  }

  async remove(path: string): Promise<Result<void, Error>> {
    const canonicalPath = this.canonical(path);
    const existsResult = await this.exists(canonicalPath);
    if (!existsResult.ok || !existsResult.value) {
      return err(new FileNotFoundError(path));
    }
    this.files.delete(canonicalPath);
    return ok(undefined);
  }

  // Additional helper methods for FileSystem interface

  stat(path: string): Promise<Result<Deno.FileInfo, Error>> {
    const canonicalPath = this.canonical(path);
    const file = this.files.get(canonicalPath);
    if (!file) {
      return Promise.resolve(err(new FileNotFoundError(path)));
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

  private getParentPath(path: string): string | null {
    const parts = path.split("/").filter(Boolean);
    if (parts.length <= 1) return null;
    return "/" + parts.slice(0, -1).join("/");
  }

  readFile(path: string): Promise<Result<string, Error>> {
    return this.readTextFile(path);
  }

  writeFile(path: string, content: string): Promise<Result<void, Error>> {
    return this.writeTextFile(path, content);
  }

  makeDir(path: string, options?: { recursive?: boolean }): Promise<Result<void, Error>> {
    return this.mkdir(path, options?.recursive);
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
