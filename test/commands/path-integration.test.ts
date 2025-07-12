import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing";
import { cleanupTempDir, createTempDir } from "../test-utils.ts";
import { createPathCommand } from "../../src/commands/path.ts";
import { join } from "@std/path";

describe("path command integration tests", () => {
  it("should find file without .md extension", async () => {
    const tempDir = await createTempDir();

    try {
      // Create a test file
      const fileName = "test-task.md";
      const filePath = join(tempDir, fileName);
      await Deno.writeTextFile(filePath, "# Test Task\n\nContent");

      // Capture output
      let capturedOutput = "";
      const originalLog = console.log;
      console.log = (msg: string) => {
        capturedOutput = msg;
      };

      // Test without .md extension
      const command = createPathCommand();
      const originalCwd = Deno.cwd();
      Deno.chdir(tempDir);
      try {
        await command.parse(["test-task", "--no-git"]);
      } finally {
        Deno.chdir(originalCwd);
      }

      // Assert
      assertEquals(capturedOutput, filePath);

      // Restore
      console.log = originalLog;
    } finally {
      await cleanupTempDir(tempDir);
    }
  });

  it("should find file by task title", async () => {
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

      // Capture output
      let capturedOutput = "";
      const originalLog = console.log;
      console.log = (msg: string) => {
        capturedOutput = msg;
      };

      // Test search by title
      const command = createPathCommand();
      const originalCwd = Deno.cwd();
      Deno.chdir(tempDir);
      try {
        await command.parse(["My Specific", "--no-git"]);
      } finally {
        Deno.chdir(originalCwd);
      }

      // Assert
      assertEquals(capturedOutput, filePath);

      // Restore
      console.log = originalLog;
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

      // Capture output and exit
      const capturedOutput: string[] = [];
      const originalLog = console.log;
      const originalError = console.error;
      const originalExit = Deno.exit;

      console.log = (msg: string) => capturedOutput.push(msg);
      console.error = (msg: string) => capturedOutput.push(`ERROR: ${msg}`);

      let exitCode: number | undefined;
      Deno.exit = (code?: number) => {
        exitCode = code;
        throw new Error("Exit called");
      };

      // Test partial match
      const command = createPathCommand();
      const originalCwd = Deno.cwd();
      Deno.chdir(tempDir);
      try {
        await command.parse(["task", "--no-git"]);
      } catch (e) {
        // Expected
      } finally {
        Deno.chdir(originalCwd);
      }

      // Assert
      assertEquals(exitCode, 1);
      assertEquals(capturedOutput.some((o) => o.includes("複数のファイルが見つかりました")), true);
      assertEquals(capturedOutput.some((o) => o.includes(file1)), true);
      assertEquals(capturedOutput.some((o) => o.includes(file2)), true);

      // Restore
      console.log = originalLog;
      console.error = originalError;
      Deno.exit = originalExit;
    } finally {
      await cleanupTempDir(tempDir);
    }
  });
});
