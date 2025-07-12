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
  let originalTaskDir: string | undefined;

  beforeEach(() => {
    // Set test environment flag
    (globalThis as any).__TEST__ = true;
    // Save original task directory env var
    originalTaskDir = Deno.env.get("LOCUS_TASK_DIRECTORY");
    // Reset ServiceContainer to ensure it picks up new env vars
    ServiceContainer.resetInstance();
  });

  afterEach(() => {
    // Clean up test environment flag
    delete (globalThis as any).__TEST__;
    // Restore original task directory env var
    if (originalTaskDir !== undefined) {
      Deno.env.set("LOCUS_TASK_DIRECTORY", originalTaskDir);
    } else {
      Deno.env.delete("LOCUS_TASK_DIRECTORY");
    }
    // Reset ServiceContainer to clean state
    ServiceContainer.resetInstance();
  });
  it("should find file without .md extension", async () => {
    const tempDir = await createTempDir();

    try {
      // Create a test file
      const fileName = "test-task.md";
      const filePath = join(tempDir, fileName);
      await Deno.writeTextFile(filePath, "# Test Task\n\nContent");

      // Run command as subprocess
      const cmd = new Deno.Command(Deno.execPath(), {
        args: [
          "run",
          "--allow-all",
          "src/cli.ts",
          "path",
          "test-task",
          "--no-git",
        ],
        cwd: Deno.cwd(),
        env: {
          ...Deno.env.toObject(),
          LOCUS_TASK_DIRECTORY: tempDir,
        },
        stdout: "piped",
        stderr: "piped",
      });

      const { code, stdout, stderr } = await cmd.output();
      const stdoutText = new TextDecoder().decode(stdout).trim();
      const stderrText = new TextDecoder().decode(stderr);

      // Assert
      if (code !== 0) {
        throw new Error(`Command failed with code ${code}. stderr: ${stderrText}`);
      }
      assertEquals(stdoutText, filePath);
    } finally {
      await cleanupTempDir(tempDir);
    }
  });

  it("should find file by partial filename", async () => {
    const tempDir = await createTempDir();

    try {
      // Create a test file with specific title
      const fileName = "2024-01-01-some-task.md";
      const filePath = join(tempDir, fileName);
      await Deno.writeTextFile(
        filePath,
        `---
date: 2024-01-01
---
# My Specific Task

Task content`,
      );

      // Run command as subprocess
      const cmd = new Deno.Command(Deno.execPath(), {
        args: [
          "run",
          "--allow-all",
          "src/cli.ts",
          "path",
          "2024-01-01-some-task",
          "--no-git",
        ],
        cwd: Deno.cwd(),
        env: {
          ...Deno.env.toObject(),
          LOCUS_TASK_DIRECTORY: tempDir,
        },
        stdout: "piped",
        stderr: "piped",
      });

      const { code, stdout, stderr } = await cmd.output();
      const stdoutText = new TextDecoder().decode(stdout).trim();
      const stderrText = new TextDecoder().decode(stderr);

      // Assert
      if (code !== 0) {
        throw new Error(`Command failed with code ${code}. stderr: ${stderrText}`);
      }
      assertEquals(stdoutText, filePath);
    } finally {
      await cleanupTempDir(tempDir);
    }
  });

  it("should handle multiple matches", async () => {
    const tempDir = await createTempDir();

    try {
      // Create multiple matching files
      const file1 = join(tempDir, "task-1.md");
      const file2 = join(tempDir, "task-2.md");
      await Deno.writeTextFile(file1, "# Task 1\n\nContent");
      await Deno.writeTextFile(file2, "# Task 2\n\nContent");

      // Run command as subprocess
      const cmd = new Deno.Command(Deno.execPath(), {
        args: [
          "run",
          "--allow-all",
          "src/cli.ts",
          "path",
          "task",
          "--no-git",
        ],
        cwd: Deno.cwd(),
        env: {
          ...Deno.env.toObject(),
          LOCUS_TASK_DIRECTORY: tempDir,
        },
        stdout: "piped",
        stderr: "piped",
      });

      const { code, stdout, stderr } = await cmd.output();
      const stderrText = new TextDecoder().decode(stderr);

      // Assert - should fail with exit code 1
      assertEquals(code, 1);
      assertEquals(stderrText.includes("複数のファイルが見つかりました"), true);
      assertEquals(stderrText.includes(file1), true);
      assertEquals(stderrText.includes(file2), true);
    } finally {
      await cleanupTempDir(tempDir);
    }
  });
});
