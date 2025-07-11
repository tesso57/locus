/**
 * Strip ANSI escape codes from a string
 */
export function stripAnsi(str: string): string {
  // deno-lint-ignore no-control-regex
  return str.replace(/\x1B[[(?);]{0,2}(;?\d)*./g, "");
}

/**
 * Create a temporary directory for testing
 */
export async function createTempDir(): Promise<string> {
  const tempDir = await Deno.makeTempDir();
  return tempDir;
}

/**
 * Clean up a temporary directory
 */
export async function cleanupTempDir(path: string): Promise<void> {
  try {
    await Deno.remove(path, { recursive: true });
  } catch {
    // Ignore errors during cleanup
  }
}
