import { assertEquals, assertRejects } from "@std/assert";
import { afterEach, beforeEach, describe, it } from "@std/testing";
import { createReadCommand } from "../../src/commands/read.ts";
import { MockTaskService } from "../mocks/mock-task-service.ts";
import { MockGitService } from "../mocks/mock-git-service.ts";
import { ServiceContainer } from "../../src/services/service-container.ts";
import { TaskInfo } from "../../src/services/task-service.ts";
import { err, ok } from "../../src/utils/result.ts";
import { TaskNotFoundError } from "../../src/utils/errors.ts";
import { stripAnsi } from "../test-utils.ts";
import { MockI18nService } from "../mocks/mock-i18n-service.ts";

describe("read command", () => {
  let mockTaskService: MockTaskService;
  let mockGitService: MockGitService;
  let mockI18n: MockI18nService;
  let capturedOutput: string[];
  let originalLog: typeof console.log;
  let originalError: typeof console.error;

  beforeEach(() => {
    // Set test environment flag
    (globalThis as any).__TEST__ = true;
    // Reset service container
    ServiceContainer.resetInstance();

    // Create mocks
    mockTaskService = new MockTaskService();
    mockGitService = new MockGitService();
    mockI18n = new MockI18nService();

    // Set up service container with mocks
    const container = ServiceContainer.getInstance();
    container.setServices({
      taskService: mockTaskService,
      gitService: mockGitService,
      i18nService: mockI18n,
    });

    // Capture console output
    capturedOutput = [];
    originalLog = console.log;
    originalError = console.error;
    console.log = (...args: unknown[]) => {
      capturedOutput.push(args.map(String).join(" "));
    };
    console.error = (...args: unknown[]) => {
      capturedOutput.push(`ERROR: ${args.map(String).join(" ")}`);
    };
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
    // Clean up test environment flag
    delete (globalThis as any).__TEST__;
  });

  it("should display task content", async () => {
    // Arrange
    const testTask: TaskInfo = {
      fileName: "2024-01-15-test-task-abc123.md",
      title: "Test Task",
      status: "todo",
      priority: "high",
      tags: ["feature", "backend"],
      created: "2024-01-15T10:00:00Z",
      path: "tesso57/locus/2024-01-15-test-task-abc123.md",
      repository: "tesso57/locus",
      frontmatter: {
        date: "2024-01-15",
        created: "2024-01-15T10:00:00Z",
        status: "todo",
        priority: "high",
        tags: ["feature", "backend"],
      },
      body: "# Test Task\n\nThis is a test task description.\n\n- Item 1\n- Item 2\n",
    };

    mockTaskService.setTask("2024-01-15-test-task-abc123.md", testTask);
    mockGitService.setRepoInfo({
      host: "github.com",
      owner: "tesso57",
      repo: "locus",
    });

    // Act
    const command = createReadCommand(mockI18n);
    await command.parse(["2024-01-15-test-task-abc123.md"]);

    // Assert
    const output = capturedOutput.join("\n");
    const strippedOutput = stripAnsi(output);

    assertEquals(strippedOutput.includes("Test Task"), true);
    assertEquals(strippedOutput.includes("ステータス:"), true);
    assertEquals(strippedOutput.includes("優先度:"), true);
    assertEquals(strippedOutput.includes("タグ:"), true);
    assertEquals(strippedOutput.includes("feature"), true);
    assertEquals(strippedOutput.includes("backend"), true);
    assertEquals(strippedOutput.includes("This is a test task description"), true);
  });

  it("should display raw markdown with --raw flag", async () => {
    // Arrange
    const testTask: TaskInfo = {
      fileName: "test.md",
      title: "Test",
      status: "todo",
      priority: "normal",
      tags: ["test"],
      created: "2024-01-15",
      path: "test.md",
      frontmatter: {
        status: "todo",
        priority: "normal",
        tags: ["test"],
      },
      body: "# Test\n\nContent here.",
    };

    mockTaskService.setTask("test.md", testTask);

    // Act
    const command = createReadCommand(mockI18n);
    await command.parse(["test.md", "--raw", "--no-git"]);

    // Assert
    const output = capturedOutput.join("\n");
    assertEquals(output.includes("---"), true);
    assertEquals(output.includes('status: "todo"'), true);
    assertEquals(output.includes('priority: "normal"'), true);
    assertEquals(output.includes("# Test"), true);
  });

  it("should output JSON with --json flag", async () => {
    // Arrange
    const testTask: TaskInfo = {
      fileName: "test.md",
      title: "Test",
      status: "todo",
      priority: "normal",
      tags: [],
      created: "2024-01-15",
      path: "test.md",
      frontmatter: { status: "todo" },
      body: "# Test",
    };

    mockTaskService.setTask("test.md", testTask);

    // Act
    const command = createReadCommand(mockI18n);
    await command.parse(["test.md", "--json", "--no-git"]);

    // Assert
    const output = capturedOutput.join("\n");
    const parsed = JSON.parse(output);
    assertEquals(parsed.fileName, "test.md");
    assertEquals(parsed.title, "Test");
    assertEquals(parsed.status, "todo");
  });

  it("should handle non-existent file", async () => {
    // Arrange
    mockTaskService.setError(
      "nonexistent.md",
      err(new TaskNotFoundError("nonexistent.md")),
    );

    // Act & Assert
    const command = createReadCommand(mockI18n);
    await assertRejects(
      async () => {
        await command.parse(["nonexistent.md", "--no-git"]);
      },
      Error,
      "Task not found",
    );

    // Check that error was logged
    const output = capturedOutput.join("\n");
    assertEquals(output.includes("エラー:"), true);
  });

  it("should handle task without body", async () => {
    // Arrange
    const testTask: TaskInfo = {
      fileName: "empty.md",
      title: "Empty Task",
      status: "todo",
      priority: "normal",
      tags: [],
      created: "2024-01-15",
      path: "empty.md",
      frontmatter: { status: "todo" },
      body: "",
    };

    mockTaskService.setTask("empty.md", testTask);

    // Act
    const command = createReadCommand(mockI18n);
    await command.parse(["empty.md", "--no-git"]);

    // Assert
    const output = capturedOutput.join("\n");
    const strippedOutput = stripAnsi(output);
    assertEquals(strippedOutput.includes("Empty Task"), true);
    assertEquals(strippedOutput.includes("（本文なし）"), true);
  });

  it("should display custom frontmatter fields", async () => {
    // Arrange
    const testTask: TaskInfo = {
      fileName: "custom.md",
      title: "Custom Task",
      status: "todo",
      priority: "normal",
      tags: [],
      created: "2024-01-15",
      path: "custom.md",
      frontmatter: {
        status: "todo",
        priority: "normal",
        assignee: "tesso57",
        project: "locus-v2",
        estimation: 5,
      },
      body: "# Custom Task",
    };

    mockTaskService.setTask("custom.md", testTask);

    // Act
    const command = createReadCommand(mockI18n);
    await command.parse(["custom.md", "--no-git"]);

    // Assert
    const output = capturedOutput.join("\n");
    const strippedOutput = stripAnsi(output);
    assertEquals(strippedOutput.includes("カスタムフィールド:"), true);
    assertEquals(strippedOutput.includes("assignee:"), true);
    assertEquals(strippedOutput.includes("tesso57"), true);
    assertEquals(strippedOutput.includes("project:"), true);
    assertEquals(strippedOutput.includes("locus-v2"), true);
  });

  it("should handle --no-color flag", async () => {
    // Arrange
    const testTask: TaskInfo = {
      fileName: "test.md",
      title: "Test",
      status: "todo",
      priority: "high",
      tags: ["test"],
      created: "2024-01-15",
      path: "test.md",
      frontmatter: { status: "todo" },
      body: "# Test",
    };

    mockTaskService.setTask("test.md", testTask);

    // Act
    const command = createReadCommand(mockI18n);
    await command.parse(["test.md", "--no-color", "--no-git"]);

    // Assert
    const output = capturedOutput.join("\n");
    // Should not contain ANSI escape codes
    // deno-lint-ignore no-control-regex
    const hasAnsiCodes = /\x1b\[[0-9;]*m/.test(output);
    if (hasAnsiCodes) {
      // Log output for debugging
      originalError("Output still contains ANSI codes:");
      originalError("Raw output:", JSON.stringify(output));
      originalError("Captured output array:", capturedOutput);
    }
    assertEquals(hasAnsiCodes, false);
  });

  it("should reject invalid file names", async () => {
    // Act & Assert
    const command = createReadCommand(mockI18n);
    await assertRejects(
      async () => {
        await command.parse(["../../../etc/passwd", "--no-git"]);
      },
      Error,
      "ファイル名にパス区切り文字",
    );

    // Check that error was logged
    const output = capturedOutput.join("\n");
    assertEquals(output.includes("エラー:"), true);
  });
});
