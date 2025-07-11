import { err, ok, Result } from "../../src/utils/result.ts";
import { FileAlreadyExistsError, FileNotFoundError } from "../../src/utils/errors.ts";
import { FileSystem } from "../../src/services/file-system.ts";

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
    this.files.set(home, { content: "", isDirectory: true });
  }

  getHome(): string {
    return "/home/test";
  }

  readTextFile(path: string): Promise<Result<string, Error>> {
    const file = this.files.get(path);
    if (!file) {
      return Promise.resolve(err(new FileNotFoundError(path)));
    }
    if (file.isDirectory) {
      return Promise.resolve(err(new Error(`${path} is a directory`)));
    }
    return Promise.resolve(ok(file.content));
  }

  async writeTextFile(path: string, content: string): Promise<Result<void, Error>> {
    // Ensure parent directory exists
    const parentPath = this.getParentPath(path);
    if (parentPath && !(await this.exists(parentPath))) {
      const mkdirResult = await this.mkdir(parentPath, true);
      if (!mkdirResult.ok) {
        return mkdirResult;
      }
    }

    this.files.set(path, { content, isDirectory: false });
    return ok(undefined);
  }

  exists(path: string): Promise<boolean> {
    return Promise.resolve(this.files.has(path));
  }

  async mkdir(path: string, recursive = false): Promise<Result<void, Error>> {
    if (await this.exists(path)) {
      const file = this.files.get(path)!;
      if (!file.isDirectory) {
        return err(new Error(`${path} already exists and is not a directory`));
      }
      return ok(undefined);
    }

    if (recursive) {
      const parts = path.split("/").filter(Boolean);
      let currentPath = "";
      for (const part of parts) {
        currentPath += "/" + part;
        if (!(await this.exists(currentPath))) {
          this.files.set(currentPath, { content: "", isDirectory: true });
        }
      }
    } else {
      const parentPath = this.getParentPath(path);
      if (parentPath && !(await this.exists(parentPath))) {
        return err(new Error(`Parent directory does not exist: ${parentPath}`));
      }
      this.files.set(path, { content: "", isDirectory: true });
    }

    return ok(undefined);
  }

  async *readDirAsyncIterable(path: string): AsyncIterable<Deno.DirEntry> {
    const dir = this.files.get(path);
    if (!dir || !dir.isDirectory) {
      return;
    }

    const pathWithSlash = path.endsWith("/") ? path : path + "/";
    const entries = new Set<string>();

    for (const [filePath] of this.files) {
      if (filePath.startsWith(pathWithSlash) && filePath !== path) {
        const relativePath = filePath.slice(pathWithSlash.length);
        const firstSlash = relativePath.indexOf("/");
        const entry = firstSlash === -1 ? relativePath : relativePath.slice(0, firstSlash);
        if (!entries.has(entry)) {
          entries.add(entry);
          const fullPath = pathWithSlash + entry;
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
    const dir = this.files.get(path);
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
    const dir = this.files.get(path);
    if (!dir) {
      return Promise.resolve(err(new FileNotFoundError(path)));
    }
    if (!dir.isDirectory) {
      return Promise.resolve(err(new Error(`${path} is not a directory`)));
    }

    const entries: string[] = [];
    const pathWithSlash = path.endsWith("/") ? path : path + "/";

    for (const [filePath] of this.files) {
      if (filePath.startsWith(pathWithSlash) && filePath !== path) {
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
    if (!(await this.exists(path))) {
      return err(new FileNotFoundError(path));
    }
    this.files.delete(path);
    return ok(undefined);
  }

  // Additional helper methods for FileSystem interface
  readFile(path: string): Promise<Result<string, Error>> {
    return this.readTextFile(path);
  }

  writeFile(path: string, content: string): Promise<Result<void, Error>> {
    return this.writeTextFile(path, content);
  }

  stat(path: string): Promise<Result<Deno.FileInfo, Error>> {
    const file = this.files.get(path);
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
    this.files.set(home, { content: "", isDirectory: true });
  }

  private getParentPath(path: string): string | null {
    const lastSlash = path.lastIndexOf("/");
    if (lastSlash <= 0) return null;
    return path.slice(0, lastSlash);
  }
}
