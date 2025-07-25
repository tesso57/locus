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

  exists(path: string): Promise<Result<boolean, Error>> {
    return this.inMemoryFs.exists(path);
  }

  async remove(path: string): Promise<Result<void, Error>> {
    // InMemoryFileSystem doesn't have remove, so we'll simulate it
    const existsResult = await this.inMemoryFs.exists(path);
    if (!existsResult.ok || !existsResult.value) {
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
    const existsResult = await this.inMemoryFs.exists(path);
    if (!existsResult.ok || !existsResult.value) {
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
