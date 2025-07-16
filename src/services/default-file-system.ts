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

  async exists(path: string): Promise<Result<boolean, Error>> {
    try {
      const result = await exists(path);
      return ok(result);
    } catch (error: unknown) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
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
