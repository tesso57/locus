import { assertEquals } from "@std/assert";
import { afterEach, beforeEach, describe, it } from "@std/testing";
import { join } from "@std/path";
import { createPathCommand } from "../../src/commands/path.ts";
import { ServiceContainer } from "../../src/services/service-container.ts";

// Helper functions for integration tests
async function createTempDir(): Promise<string> {
  const tempDir = await Deno.makeTempDir();
  await Deno.mkdir(tempDir, { recursive: true });
  return tempDir;
}

async function cleanupTempDir(dir: string): Promise<void> {
  try {
    await Deno.remove(dir, { recursive: true });
  } catch {
    // Ignore errors during cleanup
  }
}

describe("path command integration tests", () => {
  it("should handle absolute paths", async () => {
    const tempDir = await createTempDir();

    try {
      // Create a test file
      const absolutePath = join(tempDir, "test-task.md");
      await Deno.writeTextFile(absolutePath, "# Test Task\n\nContent");

      // Run command with absolute path
      const cmd = new Deno.Command(Deno.execPath(), {
        args: [
          "run",
          "--allow-all",
          "src/cli.ts",
          "path",
          absolutePath,
        ],
        cwd: Deno.cwd(),
        stdout: "piped",
        stderr: "piped",
      });

      const { code, stdout, stderr } = await cmd.output();
      const stdoutText = new TextDecoder().decode(stdout).trim();
      const stderrText = new TextDecoder().decode(stderr);

      // Assert - absolute paths should always work
      assertEquals(code, 0, `Command failed: ${stderrText}`);
      assertEquals(stdoutText, absolutePath);
    } finally {
      await cleanupTempDir(tempDir);
    }
  });

  it("should output JSON with --json flag", async () => {
    const tempDir = await createTempDir();

    try {
      // Create a test file
      const absolutePath = join(tempDir, "test.md");
      await Deno.writeTextFile(absolutePath, "# Test");

      // Run command with --json flag
      const cmd = new Deno.Command(Deno.execPath(), {
        args: [
          "run",
          "--allow-all",
          "src/cli.ts",
          "path",
          absolutePath,
          "--json",
        ],
        cwd: Deno.cwd(),
        stdout: "piped",
        stderr: "piped",
      });

      const { code, stdout } = await cmd.output();
      const stdoutText = new TextDecoder().decode(stdout).trim();

      // Assert JSON output
      assertEquals(code, 0);
      const json = JSON.parse(stdoutText);
      assertEquals(json.path, absolutePath);
      assertEquals(json.found, true);
    } finally {
      await cleanupTempDir(tempDir);
    }
  });

  it("should handle non-existent files", async () => {
    // Run command with non-existent file
    const cmd = new Deno.Command(Deno.execPath(), {
      args: [
        "run",
        "--allow-all",
        "src/cli.ts",
        "path",
        "/non/existent/file.md",
      ],
      cwd: Deno.cwd(),
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stderr } = await cmd.output();
    const stderrText = new TextDecoder().decode(stderr);

    // Assert - should fail with error message
    assertEquals(code, 1);
    // Check for error message (could be in English or Japanese)
    const hasExpectedError = stderrText.includes("File not found") ||
      stderrText.includes("ファイルが存在しません") ||
      stderrText.includes("タスクファイルが見つかりません");
    assertEquals(hasExpectedError, true, `Unexpected error message: ${stderrText}`);
  });
});
