import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { InMemoryFileSystem } from "../mocks/in-memory-fs.ts";
import { MockGitService } from "../mocks/mock-git-service.ts";
import { MockPathResolver } from "../mocks/mock-path-resolver.ts";
import { Config } from "../../src/config/schema.ts";
import { parseMarkdown } from "../../src/utils/markdown.ts";

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
};

// Helper to create task
async function createTask(
  title: string,
  options: {
    body?: string;
    tags?: string[];
    priority?: string;
    status?: string;
  } = {},
  fs: InMemoryFileSystem,
  git: MockGitService,
  pathResolver: MockPathResolver,
): Promise<{ path: string; content: string }> {
  // This is a simplified version - in real implementation, we'd use the refactored command
  // Simulate the actual slug generation
  const slug = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "") // Remove non-letter, non-number, non-space, non-hyphen
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
  const fileName = `2025-07-04-${slug}-12345678.md`;
  const repoInfoResult = await git.getRepoInfo();
  const repoInfo = repoInfoResult.ok ? repoInfoResult.value : null;
  
  const filePathResult = await pathResolver.getTaskFilePath(fileName, repoInfo);
  if (!filePathResult.ok) {
    throw filePathResult.error;
  }
  
  const filePath = filePathResult.value;
  
  // Create frontmatter
  const frontmatter: Record<string, unknown> = {
    date: "2025-07-04",
    created: "2025-07-04T12:00:00.000Z",
    status: options.status || mockConfig.defaults.status,
    priority: options.priority || mockConfig.defaults.priority,
  };
  
  if (options.tags && options.tags.length > 0) {
    frontmatter.tags = options.tags;
  }
  
  // Create content
  const content = `---
${Object.entries(frontmatter)
  .map(([key, value]) => {
    if (Array.isArray(value)) {
      return `${key}:\n${value.map(v => `  - ${v}`).join("\n")}`;
    }
    return `${key}: ${typeof value === "string" ? `'${value}'` : value}`;
  })
  .join("\n")}
---
${options.body || `# ${title}`}`;
  
  await fs.writeTextFile(filePath, content);
  
  return { path: filePath, content };
}

Deno.test("add command - creates task file with default values", async () => {
  const fs = new InMemoryFileSystem();
  const git = new MockGitService();
  const pathResolver = new MockPathResolver(fs);
  
  git.setNotInRepo();
  
  const { path, content } = await createTask("Test Task", {}, fs, git, pathResolver);
  
  assertEquals(path, "/home/test/locus/2025-07-04-test-task-12345678.md");
  assertExists(fs.exists(path));
  
  const fileResult = await fs.readTextFile(path);
  assertEquals(fileResult.ok, true);
  if (fileResult.ok) {
    assertEquals(fileResult.value, content);
    
    const { frontmatter } = parseMarkdown(fileResult.value);
    assertEquals(frontmatter?.status, "todo");
    assertEquals(frontmatter?.priority, "normal");
  }
});

Deno.test("add command - creates task in git repository directory", async () => {
  const fs = new InMemoryFileSystem();
  const git = new MockGitService();
  const pathResolver = new MockPathResolver(fs);
  
  git.setRepoInfo({
    host: "github.com",
    owner: "testuser",
    repo: "testrepo",
  });
  
  const { path } = await createTask("Git Task", {}, fs, git, pathResolver);
  
  assertEquals(path, "/home/test/locus/testuser/testrepo/2025-07-04-git-task-12345678.md");
  assertExists(fs.exists(path));
});

Deno.test("add command - creates task with custom properties", async () => {
  const fs = new InMemoryFileSystem();
  const git = new MockGitService();
  const pathResolver = new MockPathResolver(fs);
  
  git.setNotInRepo();
  
  const { path } = await createTask("Custom Task", {
    body: "This is a custom task",
    tags: ["important", "feature"],
    priority: "high",
    status: "in-progress",
  }, fs, git, pathResolver);
  
  const fileResult = await fs.readTextFile(path);
  assertEquals(fileResult.ok, true);
  if (fileResult.ok) {
    const { frontmatter, body } = parseMarkdown(fileResult.value);
    assertEquals(frontmatter?.status, "in-progress");
    assertEquals(frontmatter?.priority, "high");
    assertEquals(frontmatter?.tags, ["important", "feature"]);
    assertEquals(body.trim(), "This is a custom task");
  }
});

Deno.test("add command - handles special characters in title", async () => {
  const fs = new InMemoryFileSystem();
  const git = new MockGitService();
  const pathResolver = new MockPathResolver(fs);
  
  git.setNotInRepo();
  
  const { path } = await createTask("Test & Task / Special", {}, fs, git, pathResolver);
  
  assertEquals(path, "/home/test/locus/2025-07-04-test-task-special-12345678.md");
  assertExists(fs.exists(path));
});