import { join } from "@std/path";
import { ensureDir, expandGlob } from "@std/fs";
import { RepoInfo } from "../types.ts";
import { loadConfig } from "../config/index.ts";

/**
 * Expand tilde (~) to home directory
 */
export function expandTilde(path: string): string {
  if (path.startsWith("~/") || path === "~") {
    const home = Deno.env.get("HOME");
    if (!home) {
      throw new Error("HOME environment variable is not set");
    }
    return path.replace(/^~/, home);
  }
  return path;
}

/**
 * Get the base task directory from configuration
 */
export async function getTaskBaseDir(): Promise<string> {
  const config = await loadConfig();
  return expandTilde(config.task_directory);
}

/**
 * Resolve task directory for a given repository
 */
export async function resolveTaskDir(repoInfo: RepoInfo | null): Promise<string> {
  const baseDir = await getTaskBaseDir();
  const config = await loadConfig();
  
  if (!repoInfo || !config.git.extract_username || !config.git.username_from_remote) {
    return baseDir;
  }
  
  const taskDir = join(baseDir, repoInfo.owner, repoInfo.repo);
  await ensureDir(taskDir);
  
  return taskDir;
}

/**
 * Get all task files in a directory
 */
export async function* getTaskFiles(dir: string): AsyncIterableIterator<string> {
  try {
    for await (const file of expandGlob(join(dir, "*.md"))) {
      if (file.isFile) {
        yield file.path;
      }
    }
  } catch {
    // Directory might not exist
  }
}

/**
 * Find a task file by partial name
 */
export async function findTaskFile(dir: string, partialName: string): Promise<string | null> {
  const normalizedName = partialName.toLowerCase();
  
  for await (const filePath of getTaskFiles(dir)) {
    const fileName = filePath.split("/").pop()?.toLowerCase() || "";
    
    // Exact match (with or without .md)
    if (fileName === normalizedName || fileName === `${normalizedName}.md`) {
      return filePath;
    }
    
    // Partial match
    if (fileName.includes(normalizedName)) {
      return filePath;
    }
  }
  
  return null;
}

/**
 * Ensure a directory exists and create it if necessary
 */
export async function ensureTaskDir(dir: string): Promise<void> {
  await ensureDir(dir);
}

/**
 * Get relative path from task base directory
 */
export async function getRelativeTaskPath(absolutePath: string): Promise<string> {
  const baseDir = await getTaskBaseDir();
  
  if (absolutePath.startsWith(baseDir)) {
    return absolutePath.slice(baseDir.length + 1); // +1 for the separator
  }
  
  return absolutePath;
}

/**
 * Check if a path is within the task directory
 */
export async function isInTaskDir(path: string): Promise<boolean> {
  const baseDir = await getTaskBaseDir();
  const resolvedPath = expandTilde(path);
  
  return resolvedPath.startsWith(baseDir);
}