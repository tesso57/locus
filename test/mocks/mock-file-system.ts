import { FileSystem } from "../../src/services/file-system.ts";
import { err, ok, Result } from "../../src/utils/result.ts";
import { InMemoryFileSystem } from "./in-memory-fs.ts";

/**
 * Mock file system adapter that wraps InMemoryFileSystem
 */
export class MockFileSystem implements FileSystem {
  constructor(private inMemoryFs: InMemoryFileSystem) {}

  readTextFile(path: string): Promise<Result<string, Error>> {
    return this.inMemoryFs.readTextFile(path);
  }

  writeTextFile(path: string, content: string): Promise<Result<void, Error>> {
    return this.inMemoryFs.writeTextFile(path, content);
  }

  exists(path: string): Promise<boolean> {
    return Promise.resolve(this.inMemoryFs.exists(path));
  }

  remove(path: string): Promise<Result<void, Error>> {
    // InMemoryFileSystem doesn't have remove, so we'll simulate it
    if (!this.inMemoryFs.exists(path)) {
      return Promise.resolve(err(new Error(`File not found: ${path}`)));
    }
    // For now, we can't actually remove from InMemoryFileSystem
    // This is a limitation we'll need to address
    return Promise.resolve(ok(undefined));
  }

  readDir(path: string): Promise<Result<AsyncIterable<Deno.DirEntry>, Error>> {
    // InMemoryFileSystem already returns AsyncIterable<Deno.DirEntry>
    return this.inMemoryFs.readDir(path);
  }

  mkdir(path: string, recursive?: boolean): Promise<Result<void, Error>> {
    return this.inMemoryFs.mkdir(path, recursive);
  }

  async stat(path: string): Promise<Result<Deno.FileInfo, Error>> {
    if (!this.inMemoryFs.exists(path)) {
      return err(new Error(`No such file or directory: ${path}`));
    }

    // Check if it's a file by trying to read it
    const fileContent = await this.inMemoryFs.readTextFile(path);
    const isFile = fileContent.ok;

    // Mock FileInfo object
    const fileInfo: Deno.FileInfo = {
      isFile,
      isDirectory: !isFile,
      isSymlink: false,
      size: isFile && fileContent.ok ? fileContent.value.length : 0,
      mtime: new Date(),
      atime: new Date(),
      birthtime: new Date(),
      ctime: null,
      dev: 0,
      ino: null,
      mode: null,
      nlink: null,
      uid: null,
      gid: null,
      rdev: null,
      blksize: null,
      blocks: null,
      isBlockDevice: false,
      isCharDevice: false,
      isFifo: false,
      isSocket: false,
    };

    return ok(fileInfo);
  }
}
