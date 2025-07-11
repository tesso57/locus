import { err, ok, Result } from "../../utils/result.ts";
import { isAbsolute, resolve } from "https://deno.land/std@0.224.0/path/mod.ts";
import { FileNotFoundError } from "../../utils/errors.ts";
import { FileSystem } from "../../services/file-system.ts";
export { searchFile, searchMarkdownFiles } from "./file-search.ts";

/**
 * Check if a file exists and is a regular file
 */
export async function checkFileExists(
  path: string,
  fs: FileSystem,
): Promise<Result<boolean, Error>> {
  try {
    const exists = await fs.exists(path);
    if (!exists) {
      return ok(false);
    }

    const infoResult = await fs.stat(path);
    if (!infoResult.ok) {
      if (infoResult.error.message.includes("not found")) {
        return ok(false);
      }
      return err(infoResult.error);
    }

    return ok(infoResult.value.isFile);
  } catch (error) {
    return err(new Error(`Failed to check file: ${error}`));
  }
}

/**
 * Validate that a file exists or return an error
 */
export async function validateFileExists(
  path: string,
  fs: FileSystem,
): Promise<Result<void, Error>> {
  const existsResult = await checkFileExists(path, fs);
  if (!existsResult.ok) {
    return err(existsResult.error);
  }

  if (!existsResult.value) {
    return err(new FileNotFoundError(path));
  }

  return ok(undefined);
}

/**
 * Resolve a file path, handling both absolute and relative paths
 */
export function resolveFilePath(fileName: string, baseDir: string): string {
  if (isAbsolute(fileName)) {
    return fileName;
  }
  return resolve(baseDir, fileName);
}

/**
 * Read a text file safely
 */
export async function readTextFile(path: string, fs: FileSystem): Promise<Result<string, Error>> {
  const result = await fs.readTextFile(path);
  if (!result.ok) {
    if (result.error.message.includes("not found")) {
      return err(new FileNotFoundError(path));
    }
    return err(result.error);
  }
  return ok(result.value);
}

/**
 * Extract file name from path
 */
export function getFileName(path: string): string {
  return path.split("/").pop() || path;
}
