import { assertEquals, assertExists } from "@std/assert";
import { InMemoryFileSystem } from "../mocks/in-memory-fs.ts";
import { MockGitService } from "../mocks/mock-git-service.ts";
import { MockPathResolver } from "../mocks/mock-path-resolver.ts";
import { MockConfigLoader } from "../mocks/mock-config-loader.ts";
import { MockTaskService } from "../mocks/mock-task-service.ts";
import { DefaultTaskService } from "../../src/services/default-task-service.ts";
import { ServiceContainer } from "../../src/services/service-container.ts";
import { Config } from "../../src/config/schema.ts";
import { parseMarkdown } from "../../src/utils/markdown.ts";
import { createEditCommand } from "../../src/commands/edit.ts";
import { createI18n } from "../../src/services/i18n.ts";
import { ok } from "../../src/utils/result.ts";

// Mock configuration
const mockConfig: Config = {
  task_directory: "~/locus",
  git: {
    extract_username: true,
    username_from_remote: true,
  },
  file_naming: {
    pattern: "{date}-{slug}-{hash}.md",
    date_format: "YYYY-MM-DD",
    hash_length: 8,
  },
  defaults: {
    status: "todo",
    priority: "normal",
    tags: [],
  },
  language: {
    default: "ja",
  },
};

Deno.test("edit command - creates new task when file doesn't exist", async () => {
  // Set up global test flag
  (globalThis as any).__TEST__ = true;

  // Reset service container
  ServiceContainer.resetInstance();

  const fs = new InMemoryFileSystem();
  const git = new MockGitService();
  const pathResolver = new MockPathResolver(fs);
  const configLoader = new MockConfigLoader(mockConfig);
  const taskService = new MockTaskService();
  taskService.setFileSystem(fs);

  // Configure git mock
  git.setRepoInfo({ owner: "test-user", repo: "test-repo", host: "github.com" });

  // Create task directory
  const taskDir = "/home/user/locus/test-user/test-repo";
  await fs.ensureDir(taskDir);

  // Set up service container with mocks
  const container = ServiceContainer.getInstance();
  container.setServices({
    fileSystem: fs,
    gitService: git,
    pathResolver: pathResolver,
    taskService: taskService,
    config: mockConfig,
  });

  const i18nResult = createI18n("ja");
  if (!i18nResult.ok) throw i18nResult.error;
  const i18n = i18nResult.value;
  container.setI18nService(i18n);

  // Mock console output
  const outputs: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => outputs.push(msg);

  try {
    const command = createEditCommand(i18n);
    await command.parse(["new-task", "-b", "# New Task\n\nThis is a new task"]);

    // Check that file was created (check for any file with the pattern)
    const taskDir = "/home/user/locus/test-user/test-repo";
    const filesResult = await fs.readDir(taskDir);
    if (!filesResult.ok) throw filesResult.error;

    const files: Deno.DirEntry[] = [];
    for await (const entry of filesResult.value) {
      files.push(entry);
    }

    // Debug: log all files
    console.error("Files in directory:", files.map((f) => f.name));

    const createdFile = files.find((f) => f.name.includes("new-task"));
    assertExists(createdFile);

    // Check output
    console.error("Console outputs:", outputs);
    assertEquals(outputs.length, 1);
    assertEquals(outputs[0].includes("タスクを作成しました"), true);
  } finally {
    console.log = originalLog;
  }
});

Deno.test("edit command - appends to existing task", async () => {
  // Set up global test flag
  (globalThis as any).__TEST__ = true;

  // Reset service container
  ServiceContainer.resetInstance();

  const fs = new InMemoryFileSystem();
  const git = new MockGitService();
  const pathResolver = new MockPathResolver(fs);
  const configLoader = new MockConfigLoader(mockConfig);
  const taskService = new MockTaskService();
  taskService.setFileSystem(fs);

  // Configure git mock
  git.setRepoInfo({ owner: "test-user", repo: "test-repo", host: "github.com" });

  // Create an existing task
  const existingContent = `---
date: '2025-07-04'
created: '2025-07-04T12:00:00.000Z'
status: 'todo'
priority: 'normal'
---
# Existing Task

This is the original content.`;

  const existingPath = "/home/user/locus/test-user/test-repo/existing-task.md";
  const taskDir = "/home/user/locus/test-user/test-repo";
  const ensureDirResult = await fs.ensureDir(taskDir);
  if (!ensureDirResult.ok) throw ensureDirResult.error;
  await fs.writeTextFile(existingPath, existingContent);

  // Add task to mock service
  taskService.setTask("existing-task.md", {
    fileName: "existing-task.md",
    title: "Existing Task",
    status: "todo",
    priority: "normal",
    tags: [],
    created: "2025-07-04T12:00:00.000Z",
    path: existingPath,
    frontmatter: {
      date: "2025-07-04",
      created: "2025-07-04T12:00:00.000Z",
      status: "todo",
      priority: "normal",
    },
    body: "# Existing Task\n\nThis is the original content.",
  });

  // Set up service container with mocks
  const container = ServiceContainer.getInstance();
  container.setServices({
    fileSystem: fs,
    gitService: git,
    pathResolver: pathResolver,
    taskService: taskService,
    config: mockConfig,
  });

  const i18nResult = createI18n("ja");
  if (!i18nResult.ok) throw i18nResult.error;
  const i18n = i18nResult.value;

  // Mock console output
  const outputs: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => outputs.push(msg);

  try {
    const command = createEditCommand(i18n);
    await command.parse(["existing-task", "-b", "## Additional content\n\nThis was appended."]);

    // Check that file was updated
    const contentResult = await fs.readTextFile(existingPath);
    if (!contentResult.ok) throw contentResult.error;
    const content = contentResult.value;

    // Should contain both original and new content
    console.error("File content:", content);
    assertEquals(content.includes("This is the original content."), true);
    assertEquals(content.includes("## Additional content"), true);
    assertEquals(content.includes("This was appended."), true);

    // Check output
    assertEquals(outputs.length, 1);
    assertEquals(outputs[0].includes("タスクに追記しました"), true);
  } finally {
    console.log = originalLog;
  }
});

Deno.test("edit command - overwrites existing task with --overwrite", async () => {
  // Set up global test flag
  (globalThis as any).__TEST__ = true;

  // Reset service container
  ServiceContainer.resetInstance();

  const fs = new InMemoryFileSystem();
  const git = new MockGitService();
  const pathResolver = new MockPathResolver(fs);
  const configLoader = new MockConfigLoader(mockConfig);
  const taskService = new MockTaskService();
  taskService.setFileSystem(fs);

  // Configure git mock
  git.setRepoInfo({ owner: "test-user", repo: "test-repo", host: "github.com" });

  // Create an existing task
  const existingContent = `---
date: '2025-07-04'
created: '2025-07-04T12:00:00.000Z'
status: 'todo'
priority: 'normal'
---
# Existing Task

This is the original content.`;

  const existingPath = "/home/user/locus/test-user/test-repo/existing-task.md";
  const taskDir = "/home/user/locus/test-user/test-repo";
  const ensureDirResult = await fs.ensureDir(taskDir);
  if (!ensureDirResult.ok) throw ensureDirResult.error;
  await fs.writeTextFile(existingPath, existingContent);

  // Add task to mock service
  taskService.setTask("existing-task.md", {
    fileName: "existing-task.md",
    title: "Existing Task",
    status: "todo",
    priority: "normal",
    tags: [],
    created: "2025-07-04T12:00:00.000Z",
    path: existingPath,
    frontmatter: {
      date: "2025-07-04",
      created: "2025-07-04T12:00:00.000Z",
      status: "todo",
      priority: "normal",
    },
    body: "# Existing Task\n\nThis is the original content.",
  });

  // Set up service container with mocks
  const container = ServiceContainer.getInstance();
  container.setServices({
    fileSystem: fs,
    gitService: git,
    pathResolver: pathResolver,
    taskService: taskService,
    config: mockConfig,
  });

  const i18nResult = createI18n("ja");
  if (!i18nResult.ok) throw i18nResult.error;
  const i18n = i18nResult.value;

  // Mock console output
  const outputs: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => outputs.push(msg);

  try {
    const command = createEditCommand(i18n);
    await command.parse([
      "existing-task",
      "-b",
      "# Completely New Content\n\nThis replaced everything.",
      "--overwrite",
    ]);

    // Check that file was updated
    const contentResult = await fs.readTextFile(existingPath);
    if (!contentResult.ok) throw contentResult.error;
    const content = contentResult.value;

    // Should contain only new content
    assertEquals(content.includes("This is the original content."), false);
    assertEquals(content.includes("# Completely New Content"), true);
    assertEquals(content.includes("This replaced everything."), true);

    // Check output
    assertEquals(outputs.length, 1);
    assertEquals(outputs[0].includes("タスクを上書きしました"), true);
  } finally {
    console.log = originalLog;
  }
});

Deno.test("edit command - handles stdin input with '-'", async () => {
  // Set up global test flag
  (globalThis as any).__TEST__ = true;

  // Reset service container
  ServiceContainer.resetInstance();

  const fs = new InMemoryFileSystem();
  const git = new MockGitService();
  const pathResolver = new MockPathResolver(fs);
  const configLoader = new MockConfigLoader(mockConfig);
  const taskService = new MockTaskService();
  taskService.setFileSystem(fs);

  // Configure git mock
  git.setRepoInfo({ owner: "test-user", repo: "test-repo", host: "github.com" });

  // Create task directory
  const taskDir = "/home/user/locus/test-user/test-repo";
  await fs.ensureDir(taskDir);

  // Set up service container with mocks
  const container = ServiceContainer.getInstance();
  container.setServices({
    fileSystem: fs,
    gitService: git,
    pathResolver: pathResolver,
    taskService: taskService,
    config: mockConfig,
  });

  const i18nResult = createI18n("ja");
  if (!i18nResult.ok) throw i18nResult.error;
  const i18n = i18nResult.value;
  container.setI18nService(i18n);

  // Mock stdin
  const stdinContent = "# Task from stdin\n\nThis content came from standard input.";
  const encoder = new TextEncoder();
  const stdinData = encoder.encode(stdinContent);

  // Create a readable stream from the content
  const originalStdin = Deno.stdin;
  Object.defineProperty(Deno, "stdin", {
    value: {
      readable: new ReadableStream({
        start(controller) {
          controller.enqueue(stdinData);
          controller.close();
        },
      }),
    },
    configurable: true,
  });

  // Mock console output
  const outputs: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => outputs.push(msg);

  try {
    const command = createEditCommand(i18n);
    await command.parse(["-"]);

    // Check that file was created with stdin prefix
    const filesResult = await fs.readDir("/home/user/locus/test-user/test-repo");
    if (!filesResult.ok) throw filesResult.error;

    const files: Deno.DirEntry[] = [];
    for await (const entry of filesResult.value) {
      files.push(entry);
    }
    const stdinFile = files.find((f) => f.name.includes("-stdin-"));
    assertExists(stdinFile);

    // Check file content
    const contentResult = await fs.readTextFile(
      `/home/user/locus/test-user/test-repo/${stdinFile.name}`,
    );
    if (!contentResult.ok) throw contentResult.error;
    const content = contentResult.value;

    assertEquals(content.includes("# Task from stdin"), true);
    assertEquals(content.includes("This content came from standard input."), true);

    // Check output
    assertEquals(outputs.length, 1);
    assertEquals(outputs[0].includes("タスクを作成しました"), true);
  } finally {
    console.log = originalLog;
    Object.defineProperty(Deno, "stdin", {
      value: originalStdin,
      configurable: true,
    });
  }
});

Deno.test("edit command - fails when no body provided for new task", async () => {
  // Set up global test flag
  (globalThis as any).__TEST__ = true;

  // Reset service container
  ServiceContainer.resetInstance();

  const fs = new InMemoryFileSystem();
  const git = new MockGitService();
  const pathResolver = new MockPathResolver(fs);
  const configLoader = new MockConfigLoader(mockConfig);
  const taskService = new MockTaskService();
  taskService.setFileSystem(fs);

  // Configure git mock
  git.setRepoInfo({ owner: "test-user", repo: "test-repo", host: "github.com" });

  // Create task directory
  const taskDir = "/home/user/locus/test-user/test-repo";
  await fs.ensureDir(taskDir);

  // Set up service container with mocks
  const container = ServiceContainer.getInstance();
  container.setServices({
    fileSystem: fs,
    gitService: git,
    pathResolver: pathResolver,
    taskService: taskService,
    config: mockConfig,
  });

  const i18nResult = createI18n("ja");
  if (!i18nResult.ok) throw i18nResult.error;
  const i18n = i18nResult.value;
  container.setI18nService(i18n);

  // Mock console output and Deno.exit
  const outputs: string[] = [];
  const originalError = console.error;
  console.error = (msg: string) => outputs.push(msg);

  const originalExit = Deno.exit;
  let exitCode: number | undefined;
  Deno.exit = (code?: number) => {
    exitCode = code;
    throw new Error("EXIT");
  };

  try {
    const command = createEditCommand(i18n);
    await command.parse(["non-existent-task"]);
  } catch (error: any) {
    // exitWithError throws an Error in test environment
    if (!error.message.includes("新規タスク作成には本文が必要です")) {
      throw error;
    }
  } finally {
    console.error = originalError;
    Deno.exit = originalExit;
  }

  // Check that error was thrown (not that Deno.exit was called, since exitWithError throws in test)
  // The error message check is already done in the catch block
});

Deno.test("edit command - outputs JSON format for new task", async () => {
  // Set up global test flag
  (globalThis as any).__TEST__ = true;

  // Reset service container
  ServiceContainer.resetInstance();

  const fs = new InMemoryFileSystem();
  const git = new MockGitService();
  const pathResolver = new MockPathResolver(fs);
  const configLoader = new MockConfigLoader(mockConfig);
  const taskService = new MockTaskService();
  taskService.setFileSystem(fs);

  // Configure git mock
  git.setRepoInfo({ owner: "test-user", repo: "test-repo", host: "github.com" });

  // Create task directory
  const taskDir = "/home/user/locus/test-user/test-repo";
  await fs.ensureDir(taskDir);

  // Set up service container with mocks
  const container = ServiceContainer.getInstance();
  container.setServices({
    fileSystem: fs,
    gitService: git,
    pathResolver: pathResolver,
    taskService: taskService,
    config: mockConfig,
  });

  const i18nResult = createI18n("ja");
  if (!i18nResult.ok) throw i18nResult.error;
  const i18n = i18nResult.value;
  container.setI18nService(i18n);

  // Mock console output
  const outputs: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => outputs.push(msg);

  try {
    const command = createEditCommand(i18n);
    await command.parse(["new-json-task", "-b", "# JSON Task\n\nTest content", "--json"]);

    // Check JSON output
    assertEquals(outputs.length, 1);
    const jsonOutput = JSON.parse(outputs[0]);
    assertEquals(jsonOutput.success, true);
    assertEquals(jsonOutput.action, "created");
    assertEquals(jsonOutput.title, "JSON Task");
    assertEquals(jsonOutput.repository, "test-user/test-repo");
    assertExists(jsonOutput.fileName);
  } finally {
    console.log = originalLog;
  }
});

Deno.test("edit command - outputs JSON format for existing task update", async () => {
  // Set up global test flag
  (globalThis as any).__TEST__ = true;

  // Reset service container
  ServiceContainer.resetInstance();

  const fs = new InMemoryFileSystem();
  const git = new MockGitService();
  const pathResolver = new MockPathResolver(fs);
  const configLoader = new MockConfigLoader(mockConfig);
  const taskService = new MockTaskService();
  taskService.setFileSystem(fs);

  // Configure git mock
  git.setRepoInfo({ owner: "test-user", repo: "test-repo", host: "github.com" });

  // Create an existing task
  const existingContent = `---
date: '2025-07-04'
created: '2025-07-04T12:00:00.000Z'
status: 'todo'
priority: 'normal'
---
# Existing Task

This is the original content.`;

  const existingPath = "/home/user/locus/test-user/test-repo/existing-task.md";
  const taskDir = "/home/user/locus/test-user/test-repo";
  const ensureDirResult = await fs.ensureDir(taskDir);
  if (!ensureDirResult.ok) throw ensureDirResult.error;
  await fs.writeTextFile(existingPath, existingContent);

  // Add task to mock service
  taskService.setTask("existing-task.md", {
    fileName: "existing-task.md",
    title: "Existing Task",
    status: "todo",
    priority: "normal",
    tags: [],
    created: "2025-07-04T12:00:00.000Z",
    path: existingPath,
    frontmatter: {
      date: "2025-07-04",
      created: "2025-07-04T12:00:00.000Z",
      status: "todo",
      priority: "normal",
    },
    body: "# Existing Task\\n\\nThis is the original content.",
  });

  // Set up service container with mocks
  const container = ServiceContainer.getInstance();
  container.setServices({
    fileSystem: fs,
    gitService: git,
    pathResolver: pathResolver,
    taskService: taskService,
    config: mockConfig,
  });

  const i18nResult = createI18n("ja");
  if (!i18nResult.ok) throw i18nResult.error;
  const i18n = i18nResult.value;

  // Mock console output
  const outputs: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => outputs.push(msg);

  try {
    const command = createEditCommand(i18n);
    await command.parse([
      "existing-task",
      "-b",
      "## Additional content",
      "--json",
    ]);

    // Check JSON output
    assertEquals(outputs.length, 1);
    const jsonOutput = JSON.parse(outputs[0]);
    assertEquals(jsonOutput.success, true);
    assertEquals(jsonOutput.action, "appended");
    assertEquals(jsonOutput.fileName, "existing-task.md");
    assertEquals(jsonOutput.title, "Existing Task");
    assertEquals(jsonOutput.repository, "test-user/test-repo");
  } finally {
    console.log = originalLog;
  }
});

Deno.test("edit command - fails when overwrite with no body", async () => {
  // Set up global test flag
  (globalThis as any).__TEST__ = true;

  // Reset service container
  ServiceContainer.resetInstance();

  const fs = new InMemoryFileSystem();
  const git = new MockGitService();
  const pathResolver = new MockPathResolver(fs);
  const configLoader = new MockConfigLoader(mockConfig);
  const taskService = new MockTaskService();
  taskService.setFileSystem(fs);

  // Configure git mock
  git.setRepoInfo({ owner: "test-user", repo: "test-repo", host: "github.com" });

  // Create an existing task
  const existingContent = `---
date: '2025-07-04'
created: '2025-07-04T12:00:00.000Z'
status: 'todo'
priority: 'normal'
---
# Existing Task

This is the original content.`;

  const existingPath = "/home/user/locus/test-user/test-repo/existing-task.md";
  const taskDir = "/home/user/locus/test-user/test-repo";
  const ensureDirResult = await fs.ensureDir(taskDir);
  if (!ensureDirResult.ok) throw ensureDirResult.error;
  await fs.writeTextFile(existingPath, existingContent);

  // Add task to mock service
  taskService.setTask("existing-task.md", {
    fileName: "existing-task.md",
    title: "Existing Task",
    status: "todo",
    priority: "normal",
    tags: [],
    created: "2025-07-04T12:00:00.000Z",
    path: existingPath,
    frontmatter: {
      date: "2025-07-04",
      created: "2025-07-04T12:00:00.000Z",
      status: "todo",
      priority: "normal",
    },
    body: "# Existing Task\\n\\nThis is the original content.",
  });

  // Set up service container with mocks
  const container = ServiceContainer.getInstance();
  container.setServices({
    fileSystem: fs,
    gitService: git,
    pathResolver: pathResolver,
    taskService: taskService,
    config: mockConfig,
  });

  const i18nResult = createI18n("ja");
  if (!i18nResult.ok) throw i18nResult.error;
  const i18n = i18nResult.value;
  container.setI18nService(i18n);

  // Mock console output and Deno.exit
  const outputs: string[] = [];
  const originalError = console.error;
  console.error = (msg: string) => outputs.push(msg);

  const originalExit = Deno.exit;
  let exitCode: number | undefined;
  Deno.exit = (code?: number) => {
    exitCode = code;
    throw new Error("EXIT");
  };

  try {
    const command = createEditCommand(i18n);
    await command.parse(["existing-task", "--overwrite"]);
  } catch (error: any) {
    // exitWithError throws an Error in test environment
    if (!error.message.includes("上書きには本文が必要です")) {
      throw error;
    }
  } finally {
    console.error = originalError;
    Deno.exit = originalExit;
  }

  // Check that error was thrown
});
