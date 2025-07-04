import { Result, ok, err } from "../../src/utils/result.ts";
import { FileNotFoundError, FileAlreadyExistsError } from "../../src/utils/errors.ts";

interface FileEntry {
  content: string;
  isDirectory: boolean;
}

/**
 * In-memory file system for testing
 */
export class InMemoryFileSystem {
  private files: Map<string, FileEntry> = new Map();
  
  constructor() {
    // Initialize with home directory
    const home = this.getHome();
    this.files.set(home, { content: "", isDirectory: true });
  }
  
  getHome(): string {
    return "/home/test";
  }
  
  async readTextFile(path: string): Promise<Result<string, Error>> {
    const file = this.files.get(path);
    if (!file) {
      return err(new FileNotFoundError(path));
    }
    if (file.isDirectory) {
      return err(new Error(`${path} is a directory`));
    }
    return ok(file.content);
  }
  
  async writeTextFile(path: string, content: string): Promise<Result<void, Error>> {
    // Ensure parent directory exists
    const parentPath = this.getParentPath(path);
    if (parentPath && !this.exists(parentPath)) {
      const mkdirResult = await this.mkdir(parentPath, true);
      if (!mkdirResult.ok) {
        return mkdirResult;
      }
    }
    
    this.files.set(path, { content, isDirectory: false });
    return ok(undefined);
  }
  
  exists(path: string): boolean {
    return this.files.has(path);
  }
  
  async mkdir(path: string, recursive = false): Promise<Result<void, Error>> {
    if (this.exists(path)) {
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
        if (!this.exists(currentPath)) {
          this.files.set(currentPath, { content: "", isDirectory: true });
        }
      }
    } else {
      const parentPath = this.getParentPath(path);
      if (parentPath && !this.exists(parentPath)) {
        return err(new Error(`Parent directory does not exist: ${parentPath}`));
      }
      this.files.set(path, { content: "", isDirectory: true });
    }
    
    return ok(undefined);
  }
  
  async readDir(path: string): Promise<Result<string[], Error>> {
    const dir = this.files.get(path);
    if (!dir) {
      return err(new FileNotFoundError(path));
    }
    if (!dir.isDirectory) {
      return err(new Error(`${path} is not a directory`));
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
    
    return ok(entries);
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