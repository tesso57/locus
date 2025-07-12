import { FileSystem } from "./file-system.ts";
import { err, ok, Result } from "../utils/result.ts";
import { exists } from "@std/fs";

/**
 * Default file system implementation using Deno APIs
 */
export class DefaultFileSystem implements FileSystem {
  async readTextFile(path: string): Promise<Result<string, Error>> {
    try {
      const content = await Deno.readTextFile(path);
      return ok(content);
    } catch (error: unknown) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async writeTextFile(path: string, content: string): Promise<Result<void, Error>> {
    try {
      await Deno.writeTextFile(path, content);
      return ok(undefined);
    } catch (error: unknown) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async exists(path: string): Promise<boolean> {
    return await exists(path);
  }

  async remove(path: string): Promise<Result<void, Error>> {
    try {
      await Deno.remove(path);
      return ok(undefined);
    } catch (error: unknown) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  readDir(path: string): Promise<Result<AsyncIterable<Deno.DirEntry>, Error>> {
    try {
      const iter = Deno.readDir(path);
      return Promise.resolve(ok(iter));
    } catch (error: unknown) {
      return Promise.resolve(err(error instanceof Error ? error : new Error(String(error))));
    }
  }

  async mkdir(path: string, recursive?: boolean): Promise<Result<void, Error>> {
    try {
      await Deno.mkdir(path, { recursive });
      return ok(undefined);
    } catch (error: unknown) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async stat(path: string): Promise<Result<Deno.FileInfo, Error>> {
    try {
      const fileInfo = await Deno.stat(path);
      return ok(fileInfo);
    } catch (error: unknown) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
