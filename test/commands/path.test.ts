import { assertEquals } from "@std/assert";
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { createPathCommand } from "../../src/commands/path.ts";
import { MockTaskService } from "../mocks/mock-task-service.ts";
import { MockGitService } from "../mocks/mock-git-service.ts";
import { MockPathResolver } from "../mocks/mock-path-resolver.ts";
import { ServiceContainer } from "../../src/services/service-container.ts";
import { ok } from "../../src/utils/result.ts";
import { join } from "@std/path";
import { InMemoryFileSystem } from "../mocks/in-memory-fs.ts";
import { Config } from "../../src/types.ts";
import { MockI18nService } from "../mocks/mock-i18n-service.ts";
import { testUserPath } from "../utils/test-paths.ts";

describe("path command", () => {
  let mockTaskService: MockTaskService;
  let mockGitService: MockGitService;
  let mockPathResolver: MockPathResolver;
  let mockFs: InMemoryFileSystem;
  let mockI18n: MockI18nService;
  let capturedOutput: string[];
  let originalLog: typeof console.log;
  let originalError: typeof console.error;
  let originalExit: typeof Deno.exit;

  beforeEach(() => {
    // Set test environment flag
    (globalThis as any).__TEST__ = true;

    // Reset service container
    ServiceContainer.resetInstance();

    // Create mocks
    mockTaskService = new MockTaskService();
    mockGitService = new MockGitService();
    mockFs = new InMemoryFileSystem();
    mockPathResolver = new MockPathResolver(mockFs, testUserPath("locus", "tasks"));
    mockI18n = new MockI18nService();

    // Create mock config
    const mockConfig: Config = {
      task_directory: testUserPath("locus", "tasks"),
      git: {
        extract_username: true,
        username_from_remote: false,
      },
      file_naming: {
        pattern: "{date}-{slug}-{hash}",
        date_format: "YYYY-MM-DD",
        hash_length: 8,
      },
      defaults: {
        status: "todo",
        priority: "medium",
        tags: [],
      },
      language: {
        default: "ja",
      },
    };

    // Set up service container with mocks
    const container = ServiceContainer.getInstance();
    container.setServices({
      config: mockConfig,
      taskService: mockTaskService,
      gitService: mockGitService,
      pathResolver: mockPathResolver,
      fileSystem: mockFs,
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

    // Mock Deno.exit to prevent actual exit during tests
    originalExit = Deno.exit;
    Deno.exit = (code?: number) => {
      throw new Error(`Exit called with code: ${code}`);
    };
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
    Deno.exit = originalExit;

    // Clean up test environment flag
    delete (globalThis as any).__TEST__;
  });

  it("should display absolute path for task file", async () => {
    // Setup
    const taskDir = testUserPath("locus", "tasks");
    const fileName = "test-task.md";
    const expectedPath = join(taskDir, fileName);

    mockGitService.setRepoInfo(null);

    // Create the file in mock file system
    await mockFs.mkdir(taskDir, true);
    await mockFs.writeTextFile(expectedPath, "# Test Task\n\nContent");

    // Execute
    const command = createPathCommand(mockI18n);
    let exited = false;
    let exitedWith = null;
    try {
      await command.parse(["test-task.md", "--no-git"]);
    } catch (e) {
      if (e instanceof Error) {
        if (e.message?.includes("Exit called with code:")) {
          const match = e.message.match(/Exit called with code: (\d+)/);
          exitedWith = match ? parseInt(match[1]) : null;
          exited = true;
        } else {
          originalError("Unexpected error:", e);
        }
      } else {
        originalError("Unexpected error:", e);
      }
    }

    // Assert
    // Debug logs are using originalLog to avoid being captured
    originalLog("Captured output:", capturedOutput);
    originalLog("Exited:", exited, "with code:", exitedWith);

    // If it exited with error, show why
    if (exited && exitedWith === 1) {
      originalLog("Error outputs:", capturedOutput.filter((o) => o.includes("ERROR:")));
    }

    const nonErrorOutputs = capturedOutput.filter((o) => !o.includes("ERROR:") && o.trim() !== "");
    originalLog("Non-error outputs:", nonErrorOutputs);
    originalLog("Expected path:", expectedPath);
    assertEquals(nonErrorOutputs.length, 1);
    assertEquals(nonErrorOutputs[0], expectedPath);
  });

  it("should handle absolute path input", async () => {
    // Setup
    const absolutePath = "/absolute/path/to/file.md";

    // Create the file in mock file system
    await mockFs.mkdir("/absolute/path/to", true);
    await mockFs.writeTextFile(absolutePath, "# Absolute Path Task\n\nContent");

    // Execute
    const command = createPathCommand(mockI18n);
    await command.parse([absolutePath]);

    // Assert
    assertEquals(capturedOutput.length, 1);
    assertEquals(capturedOutput[0], absolutePath);
  });

  it("should error when file not found", async () => {
    // Setup
    const taskDir = testUserPath("locus", "tasks");
    const fileName = "non-existent.md";

    mockGitService.setRepoInfo(null);

    // Create empty task directory
    await mockFs.mkdir(taskDir, true);

    // Execute
    let exitCode: number | undefined;
    const originalExit = Deno.exit;
    Deno.exit = (code?: number) => {
      exitCode = code;
      throw new Error("Exit called");
    };

    const command = createPathCommand(mockI18n);

    try {
      await command.parse([fileName, "--no-git"]);
    } catch (e) {
      // Expected to throw due to exit
    }

    // Assert
    assertEquals(exitCode, 1);
    assertEquals(
      capturedOutput.some((output) => output.includes("タスクファイルが見つかりません")),
      true,
    );

    // Restore
    Deno.exit = originalExit;
  });

  it("should find file without .md extension", async () => {
    // Setup
    const taskDir = testUserPath("locus", "tasks");
    const fileName = "test-task"; // Without .md
    const expectedPath = join(taskDir, "test-task.md");

    mockGitService.setRepoInfo(null);

    // Create the file in mock file system
    await mockFs.mkdir(taskDir, true);
    await mockFs.writeTextFile(expectedPath, "# Test Task\n\nContent");

    // Execute
    const command = createPathCommand(mockI18n);
    await command.parse([fileName, "--no-git"]);

    // Assert
    assertEquals(capturedOutput.length, 1);
    assertEquals(capturedOutput[0], expectedPath);
  });

  it("should find file by task title", async () => {
    // Setup
    const taskDir = testUserPath("locus", "tasks");
    const searchTerm = "My Task"; // Search by title
    const expectedPath = join(taskDir, "2024-01-01-some-task.md");

    mockGitService.setRepoInfo(null);

    // Create the file in mock file system with specific title
    await mockFs.mkdir(taskDir, true);
    await mockFs.writeTextFile(
      expectedPath,
      `---
date: 2024-01-01
---
# My Task Title

Task content`,
    );

    // Execute
    const command = createPathCommand(mockI18n);
    await command.parse([searchTerm, "--no-git"]);

    // Assert
    assertEquals(capturedOutput.length, 1);
    assertEquals(capturedOutput[0], expectedPath);
  });

  it("should handle multiple matches", async () => {
    // Setup
    const taskDir = testUserPath("locus", "tasks");
    const searchTerm = "task"; // Partial match
    const paths = [
      join(taskDir, "task-1.md"),
      join(taskDir, "task-2.md"),
    ];

    mockGitService.setRepoInfo(null);

    // Create multiple matching files in mock file system
    await mockFs.mkdir(taskDir, true);
    await mockFs.writeTextFile(
      paths[0],
      `---
date: 2024-01-01
---
# Some Task 1

Content`,
    );
    await mockFs.writeTextFile(
      paths[1],
      `---
date: 2024-01-01
---
# Some Task 2

Content`,
    );

    let exitCode: number | undefined;
    const originalExit = Deno.exit;
    Deno.exit = (code?: number) => {
      exitCode = code;
      throw new Error("Exit called");
    };

    // Execute
    const command = createPathCommand(mockI18n);

    try {
      await command.parse([searchTerm, "--no-git"]);
    } catch (e) {
      // Expected to throw due to exit
    }

    // Assert
    assertEquals(exitCode, 1);
    assertEquals(
      capturedOutput.some((output) => output.includes("複数のファイルが見つかりました")),
      true,
    );
    assertEquals(capturedOutput.some((output) => output.includes(paths[0])), true);
    assertEquals(capturedOutput.some((output) => output.includes(paths[1])), true);

    // Restore
    Deno.exit = originalExit;
  });
});
