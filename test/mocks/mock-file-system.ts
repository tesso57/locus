import { FileSystem } from "../../src/services/file-system.ts";
import { Result, err, ok } from "../../src/utils/result.ts";
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

  async readDir(path: string): Promise<Result<AsyncIterable<Deno.DirEntry>, Error>> {
    const result = await this.inMemoryFs.readDir(path);
    if (!result.ok) {
      return err(result.error);
    }

    // Convert string[] to AsyncIterable<Deno.DirEntry>
    const entries = result.value;
    const inMemoryFs = this.inMemoryFs;
    async function* dirEntries(): AsyncIterable<Deno.DirEntry> {
      for (const name of entries) {
        const fullPath = path.endsWith("/") ? `${path}${name}` : `${path}/${name}`;
        
        // Check if it's a file by trying to read it
        // If readTextFile succeeds, it's a file; otherwise, it's a directory
        const fileContent = await inMemoryFs.readTextFile(fullPath);
        let isFile = false;
        if (fileContent.ok) {
          isFile = true;
        } else if (!fileContent.ok && fileContent.error.message?.includes("is a directory")) {
          isFile = false;
        }
        
        yield {
          name,
          isFile: isFile,
          isDirectory: !isFile,
          isSymlink: false,
        };
      }
    }

    return ok(dirEntries());
  }

  mkdir(path: string, recursive?: boolean): Promise<Result<void, Error>> {
    return this.inMemoryFs.mkdir(path, recursive);
  }
}