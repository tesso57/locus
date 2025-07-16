import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import { ensureDir } from "@std/fs";

Deno.test("read command integration - displays task content", async () => {
  // Set test environment flag
  (globalThis as any).__TEST__ = true;

  try {
    // Create a temporary directory for testing
    const tempDir = await Deno.makeTempDir();
    const taskDir = join(tempDir, "tesso57", "locus");
    await ensureDir(taskDir);

    // Create a test task file
    const taskContent = `---
date: "2024-01-15"
created: "2024-01-15T10:00:00Z"
status: todo
priority: high
tags: [feature, backend]
---

# Test Task

This is a test task description.

- Item 1
- Item 2
`;

    const taskPath = join(taskDir, "2024-01-15-test-task-abc123.md");
    await Deno.writeTextFile(taskPath, taskContent);

    try {
      // Run the read command
      const cmd = new Deno.Command(Deno.execPath(), {
        args: [
          "run",
          "--allow-all",
          "src/cli.ts",
          "read",
          "2024-01-15-test-task-abc123.md",
          "--no-git",
        ],
        cwd: Deno.cwd(),
        env: {
          ...Deno.env.toObject(),
          LOCUS_TASK_DIRECTORY: tempDir,
          LANG: "ja_JP.UTF-8",
          LOCUS_LANG: "ja",
        },
        stdout: "piped",
        stderr: "piped",
      });

      const { code, stdout, stderr } = await cmd.output();
      const stdoutText = new TextDecoder().decode(stdout);
      const stderrText = new TextDecoder().decode(stderr);

      // Assert command succeeded
      assertEquals(code, 0, `Command failed with stderr: ${stderrText}`);

      // Check output contains expected content
      assertEquals(stdoutText.includes("Test Task"), true);
      assertEquals(stdoutText.includes("ステータス:"), true);
      assertEquals(stdoutText.includes("優先度:"), true);
      assertEquals(stdoutText.includes("タグ:"), true);
      assertEquals(stdoutText.includes("feature"), true);
      assertEquals(stdoutText.includes("backend"), true);
      assertEquals(stdoutText.includes("This is a test task description"), true);
    } finally {
      // Clean up
      await Deno.remove(tempDir, { recursive: true });
    }
  } finally {
    // Clean up test environment flag
    delete (globalThis as any).__TEST__;
  }
});

Deno.test("read command integration - displays raw markdown", async () => {
  // Set test environment flag
  (globalThis as any).__TEST__ = true;

  try {
    // Create a temporary directory for testing
    const tempDir = await Deno.makeTempDir();
    // Create a test task file directly in tempDir (no subdirectory for --no-git)
    const taskContent = `---
status: todo
priority: normal
tags: [test]
---

# Test

Content here.`;

    const taskPath = join(tempDir, "test.md");
    await Deno.writeTextFile(taskPath, taskContent);

    try {
      // Run the read command with --raw flag
      const cmd = new Deno.Command(Deno.execPath(), {
        args: [
          "run",
          "--allow-all",
          "src/cli.ts",
          "read",
          taskPath, // Use absolute path
          "--raw",
          "--no-git",
        ],
        cwd: Deno.cwd(),
        env: {
          ...Deno.env.toObject(),
          LOCUS_TASK_DIRECTORY: tempDir,
          LANG: "ja_JP.UTF-8",
          LOCUS_LANG: "ja",
        },
        stdout: "piped",
        stderr: "piped",
      });

      const { code, stdout, stderr } = await cmd.output();
      const stdoutText = new TextDecoder().decode(stdout);
      const stderrText = new TextDecoder().decode(stderr);

      // Assert command succeeded
      assertEquals(code, 0, `Command failed with stderr: ${stderrText}`);

      // Check raw markdown output
      assertEquals(stdoutText.includes("---"), true);
      assertEquals(
        stdoutText.includes("status: todo") || stdoutText.includes('status: "todo"'),
        true,
      );
      assertEquals(stdoutText.includes("# Test"), true);
      assertEquals(stdoutText.includes("Content here."), true);
    } finally {
      // Clean up
      await Deno.remove(tempDir, { recursive: true });
    }
  } finally {
    // Clean up test environment flag
    delete (globalThis as any).__TEST__;
  }
});
