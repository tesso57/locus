import { assert, assertEquals, assertExists } from "@std/assert";
import { basename } from "@std/path";
import { InMemoryFileSystem } from "../mocks/in-memory-fs.ts";
import { MockGitService } from "../mocks/mock-git-service.ts";
import { MockPathResolver } from "../mocks/mock-path-resolver.ts";
import { MockFileSystem } from "../mocks/mock-file-system.ts";
import { Config } from "../../src/config/schema.ts";
import { FrontMatter } from "../../src/types.ts";
import { DefaultTaskService } from "../../src/services/default-task-service.ts";
import { TaskService } from "../../src/services/task-service.ts";
import { MockFileNameService } from "../mocks/mock-filename-service.ts";
import { MockMarkdownService } from "../mocks/mock-markdown-service.ts";
import { testPath } from "../utils/test-paths.ts";

// Mock dependencies
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

// Helper to create test tasks
async function createTestTask(
  fs: InMemoryFileSystem,
  path: string,
  title: string,
  frontmatter: FrontMatter,
  body?: string,
): Promise<void> {
  const markdownService = new MockMarkdownService();
  const result = markdownService.generateMarkdown(
    frontmatter,
    body || `# ${title}\n\nTask content here.`,
  );
  if (!result.ok) {
    throw result.error;
  }
  await fs.writeTextFile(path, result.value);
}

Deno.test("list command - shows tasks in default directory", async () => {
  const fs = new InMemoryFileSystem();
  const git = new MockGitService();
  const pathResolver = new MockPathResolver(fs);
  const mockFileSystem = new MockFileSystem(fs);
  const fileNameService = new MockFileNameService();
  const markdownService = new MockMarkdownService();
  const taskService = new DefaultTaskService(
    pathResolver,
    git,
    mockConfig,
    mockFileSystem,
    fileNameService,
    markdownService,
  );

  git.setNotInRepo();

  const taskDir = testPath("locus");
  await fs.mkdir(taskDir, true);

  // Create test tasks
  await createTestTask(
    fs,
    `${taskDir}/task1.md`,
    "Task 1",
    {
      date: "2025-07-01",
      created: "2025-07-01T10:00:00Z",
      status: "todo",
      priority: "high",
      tags: ["urgent"],
    },
  );

  await createTestTask(
    fs,
    `${taskDir}/task2.md`,
    "Task 2",
    {
      date: "2025-07-02",
      created: "2025-07-02T10:00:00Z",
      status: "done",
      priority: "normal",
      tags: ["feature"],
    },
  );

  const result = await taskService.listTasks({ all: false });
  assertExists(result.ok);
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.length, 2);
  }
});

Deno.test("list command - shows tasks in git repository directory", async () => {
  const fs = new InMemoryFileSystem();
  const git = new MockGitService();
  const pathResolver = new MockPathResolver(fs);
  const mockFileSystem = new MockFileSystem(fs);
  const fileNameService = new MockFileNameService();
  const markdownService = new MockMarkdownService();
  const taskService = new DefaultTaskService(
    pathResolver,
    git,
    mockConfig,
    mockFileSystem,
    fileNameService,
    markdownService,
  );

  const repoInfo = {
    host: "github.com",
    owner: "testuser",
    repo: "testrepo",
  };
  git.setRepoInfo(repoInfo);

  const taskDir = testPath("locus", "testuser", "testrepo");
  await fs.mkdir(taskDir, true);

  await createTestTask(
    fs,
    `${taskDir}/git-task.md`,
    "Git Task",
    {
      date: "2025-07-03",
      created: "2025-07-03T10:00:00Z",
      status: "in_progress",
      priority: "high",
      tags: ["git", "feature"],
    },
  );

  const result = await taskService.listTasks({ all: false, repoInfo });
  assertExists(result.ok);
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.length, 1);
    assertEquals(result.value[0].fileName, "git-task.md");
  }
});

Deno.test("list command - filters by status", async () => {
  const fs = new InMemoryFileSystem();
  const git = new MockGitService();
  const pathResolver = new MockPathResolver(fs);
  const mockFileSystem = new MockFileSystem(fs);
  const fileNameService = new MockFileNameService();
  const markdownService = new MockMarkdownService();
  const taskService = new DefaultTaskService(
    pathResolver,
    git,
    mockConfig,
    mockFileSystem,
    fileNameService,
    markdownService,
  );

  git.setNotInRepo();

  const taskDir = testPath("locus");
  await fs.mkdir(taskDir, true);

  // Create tasks with different statuses
  await createTestTask(
    fs,
    `${taskDir}/todo-task.md`,
    "Todo Task",
    {
      date: "2025-07-01",
      created: "2025-07-01T10:00:00Z",
      status: "todo",
      priority: "normal",
    },
  );

  await createTestTask(
    fs,
    `${taskDir}/done-task.md`,
    "Done Task",
    {
      date: "2025-07-02",
      created: "2025-07-02T10:00:00Z",
      status: "done",
      priority: "normal",
    },
  );

  await createTestTask(
    fs,
    `${taskDir}/in-progress-task.md`,
    "In Progress Task",
    {
      date: "2025-07-03",
      created: "2025-07-03T10:00:00Z",
      status: "in_progress",
      priority: "normal",
    },
  );

  // Test filtering by todo status
  const todoResult = await taskService.listTasks({ status: "todo" });
  assertExists(todoResult.ok);
  assertEquals(todoResult.ok, true);
  if (todoResult.ok) {
    assertEquals(todoResult.value.length, 1);
    assertEquals(todoResult.value[0].status, "todo");
  }

  // Test filtering by done status
  const doneResult = await taskService.listTasks({ status: "done" });
  assertExists(doneResult.ok);
  assertEquals(doneResult.ok, true);
  if (doneResult.ok) {
    assertEquals(doneResult.value.length, 1);
    assertEquals(doneResult.value[0].status, "done");
  }
});

Deno.test("list command - filters by priority", async () => {
  const fs = new InMemoryFileSystem();
  const git = new MockGitService();
  const pathResolver = new MockPathResolver(fs);
  const mockFileSystem = new MockFileSystem(fs);
  const fileNameService = new MockFileNameService();
  const markdownService = new MockMarkdownService();
  const taskService = new DefaultTaskService(
    pathResolver,
    git,
    mockConfig,
    mockFileSystem,
    fileNameService,
    markdownService,
  );

  git.setNotInRepo();

  const taskDir = testPath("locus");
  await fs.mkdir(taskDir, true);

  // Create tasks with different priorities
  await createTestTask(
    fs,
    `${taskDir}/high-priority.md`,
    "High Priority Task",
    {
      date: "2025-07-01",
      created: "2025-07-01T10:00:00Z",
      status: "todo",
      priority: "high",
    },
  );

  await createTestTask(
    fs,
    `${taskDir}/low-priority.md`,
    "Low Priority Task",
    {
      date: "2025-07-02",
      created: "2025-07-02T10:00:00Z",
      status: "todo",
      priority: "low",
    },
  );

  // Test filtering by high priority
  const highResult = await taskService.listTasks({ priority: "high" });
  assertExists(highResult.ok);
  assertEquals(highResult.ok, true);
  if (highResult.ok) {
    assertEquals(highResult.value.length, 1);
    assertEquals(highResult.value[0].priority, "high");
  }
});

Deno.test("list command - filters by tags", async () => {
  const fs = new InMemoryFileSystem();
  const git = new MockGitService();
  const pathResolver = new MockPathResolver(fs);
  const mockFileSystem = new MockFileSystem(fs);
  const fileNameService = new MockFileNameService();
  const markdownService = new MockMarkdownService();
  const taskService = new DefaultTaskService(
    pathResolver,
    git,
    mockConfig,
    mockFileSystem,
    fileNameService,
    markdownService,
  );

  git.setNotInRepo();

  const taskDir = testPath("locus");
  await fs.mkdir(taskDir, true);

  // Create tasks with different tags
  await createTestTask(
    fs,
    `${taskDir}/feature-task.md`,
    "Feature Task",
    {
      date: "2025-07-01",
      created: "2025-07-01T10:00:00Z",
      status: "todo",
      priority: "normal",
      tags: ["feature", "backend"],
    },
  );

  await createTestTask(
    fs,
    `${taskDir}/bug-task.md`,
    "Bug Task",
    {
      date: "2025-07-02",
      created: "2025-07-02T10:00:00Z",
      status: "todo",
      priority: "high",
      tags: ["bug", "critical"],
    },
  );

  await createTestTask(
    fs,
    `${taskDir}/doc-task.md`,
    "Documentation Task",
    {
      date: "2025-07-03",
      created: "2025-07-03T10:00:00Z",
      status: "todo",
      priority: "low",
      tags: ["documentation"],
    },
  );

  // Test filtering by feature tag
  const featureResult = await taskService.listTasks({ tags: ["feature"] });
  assertExists(featureResult.ok);
  assertEquals(featureResult.ok, true);
  if (featureResult.ok) {
    assertEquals(featureResult.value.length, 1);
    assertEquals(featureResult.value[0].tags.includes("feature"), true);
  }

  // Test filtering by bug tag
  const bugResult = await taskService.listTasks({ tags: ["bug"] });
  assertExists(bugResult.ok);
  assertEquals(bugResult.ok, true);
  if (bugResult.ok) {
    assertEquals(bugResult.value.length, 1);
    assertEquals(bugResult.value[0].tags.includes("bug"), true);
  }
});

Deno.test("list command - handles empty directory", async () => {
  const fs = new InMemoryFileSystem();
  const git = new MockGitService();
  const pathResolver = new MockPathResolver(fs);
  const mockFileSystem = new MockFileSystem(fs);
  const fileNameService = new MockFileNameService();
  const markdownService = new MockMarkdownService();
  const taskService = new DefaultTaskService(
    pathResolver,
    git,
    mockConfig,
    mockFileSystem,
    fileNameService,
    markdownService,
  );

  git.setNotInRepo();

  const taskDir = testPath("locus");
  await fs.mkdir(taskDir, true);

  const result = await taskService.listTasks({ all: false });
  assertExists(result.ok);
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.length, 0);
  }
});

Deno.test("list command - handles missing frontmatter", async () => {
  const fs = new InMemoryFileSystem();
  const git = new MockGitService();
  const pathResolver = new MockPathResolver(fs);
  const mockFileSystem = new MockFileSystem(fs);
  const fileNameService = new MockFileNameService();
  const markdownService = new MockMarkdownService();
  const taskService = new DefaultTaskService(
    pathResolver,
    git,
    mockConfig,
    mockFileSystem,
    fileNameService,
    markdownService,
  );

  git.setNotInRepo();

  const taskDir = testPath("locus");
  await fs.mkdir(taskDir, true);

  // Create task without frontmatter
  await fs.writeTextFile(
    `${taskDir}/no-frontmatter.md`,
    "# Task without frontmatter\n\nJust content.",
  );

  // Tasks without frontmatter should be skipped
  const result = await taskService.listTasks({ all: false });
  assertExists(result.ok);
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.length, 0);
  }
});

Deno.test("list command - outputs oneline format by default", async () => {
  const fs = new InMemoryFileSystem();
  const git = new MockGitService();
  const pathResolver = new MockPathResolver(fs, testPath("locus"));
  const mockFileSystem = new MockFileSystem(fs);
  const taskService = new DefaultTaskService(pathResolver, git, mockConfig, mockFileSystem);

  // Set up git repository
  git.setRepoInfo({ host: "github.com", owner: "test", repo: "repo" });

  const taskDir = testPath("locus/test/repo");
  await fs.mkdir(taskDir, true);

  // Create test tasks with various attributes
  await createTestTask(
    fs,
    `${taskDir}/task1.md`,
    "Task with tags",
    {
      date: "2025-07-01",
      created: "2025-07-01T10:00:00Z",
      status: "todo",
      priority: "high",
      tags: ["bug", "urgent"],
    },
  );

  await createTestTask(
    fs,
    `${taskDir}/task2.md`,
    "Simple task",
    {
      date: "2025-07-02",
      created: "2025-07-02T10:00:00Z",
      status: "inProgress",
      priority: "normal",
    },
  );

  const result = await taskService.listTasks({
    repoInfo: { host: "github.com", owner: "test", repo: "repo" },
  });
  assertExists(result.ok);
  assertEquals(result.ok, true);

  if (result.ok) {
    const tasks = result.value;
    assertEquals(tasks.length, 2);

    // Verify the data structure has all required fields for oneline format
    const task1 = tasks.find((t) => t.title === "Task with tags");
    assertExists(task1);
    assertEquals(task1.repository, "test/repo");
    assertEquals(task1.status, "todo");
    assertEquals(task1.priority, "high");
    assertEquals(task1.tags, ["bug", "urgent"]);
    assert(task1.created.startsWith("2025-07-01"));
    assert(basename(task1.path) === "task1.md");

    const task2 = tasks.find((t) => t.title === "Simple task");
    assertExists(task2);
    assertEquals(task2.status, "inProgress");
    assertEquals(task2.priority, "normal");
    assertEquals(task2.tags.length, 0);
  }
});
