/**
 * Test utilities to handle cross-platform compatibility
 */

/**
 * Normalize path separators for cross-platform compatibility
 * Converts all backslashes to forward slashes
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

/**
 * Check if running on Windows
 */
export function isWindows(): boolean {
  return Deno.build.os === "windows";
}

/**
 * Join paths with normalized separators
 */
export function joinPath(...parts: string[]): string {
  return normalizePath(parts.join("/"));
}
