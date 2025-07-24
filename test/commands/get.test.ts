import { assertEquals, assertStringIncludes } from "@std/assert";
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { createGetCommand } from "../../src/commands/get.ts";
import { createI18n } from "../../src/services/i18n.ts";
import { ServiceContainer } from "../../src/services/service-container.ts";
import { MockTagsService } from "../mocks/mock-tags-service.ts";
import { MockGitService } from "../mocks/mock-git-service.ts";
import { FrontMatter } from "../../src/types.ts";
import { Config } from "../../src/config/schema.ts";

describe("get command", () => {
  let mockTagsService: MockTagsService;
  let mockGitService: MockGitService;
  let capturedOutput: string[];
  let originalLog: typeof console.log;
  let originalError: typeof console.error;
  let originalExit: typeof Deno.exit;
  let exitCode: number | undefined;
  let i18n: any;

  beforeEach(() => {
    // Set test environment flag
    (globalThis as any).__TEST__ = true;
    // Reset service container
    ServiceContainer.resetInstance();

    // Create i18n service
    const i18nResult = createI18n("en");
    i18n = i18nResult.ok ? i18nResult.value : (() => {
      throw new Error("Failed to create i18n");
    })();

    // Create mocks
    mockTagsService = new MockTagsService();
    mockGitService = new MockGitService();

    // Mock config
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
        custom: {},
      },
      language: {
        default: "en",
      },
    };

    // Set up service container with mocks
    const container = ServiceContainer.getInstance();
    container.setServices({
      config: mockConfig,
      tagsService: mockTagsService,
      gitService: mockGitService,
      i18nService: i18n,
    });

    // Capture console output
    capturedOutput = [];
    originalLog = console.log;
    originalError = console.error;
    console.log = (...args: any[]) => capturedOutput.push(String(args[0]));
    console.error = (...args: any[]) => capturedOutput.push(`ERROR: ${String(args[0])}`);

    // Mock Deno.exit
    originalExit = Deno.exit;
    exitCode = undefined;
    Deno.exit = (code?: number) => {
      exitCode = code;
      throw new Error("EXIT");
    };
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
    Deno.exit = originalExit;
    mockTagsService.reset();
  });

  it("should create get command", () => {
    const getCommand = createGetCommand(i18n);
    assertEquals(getCommand.getName(), "get");
    assertEquals(getCommand.getDescription(), "Get task properties");
  });

  it("should have correct options", () => {
    const getCommand = createGetCommand(i18n);
    const options = getCommand.getOptions();

    // Check that noGit and json options exist
    const hasNoGit = options.some((opt) => opt.flags.includes("--no-git"));
    const hasJson = options.some((opt) => opt.flags.includes("--json"));

    assertEquals(hasNoGit, true);
    assertEquals(hasJson, true);
  });

  it("should accept fileName and optional property arguments", () => {
    const getCommand = createGetCommand(i18n);
    const args = getCommand.getArguments();

    assertEquals(args.length, 2);
    assertEquals(args[0].name, "fileName");
    assertEquals(args[1].name, "property");
  });

  describe("get specific property", () => {
    it("should get string property", async () => {
      const frontmatter: FrontMatter = {
        date: "2025-07-24",
        created: "2025-07-24T10:00:00Z",
        status: "in_progress",
        priority: "high",
      };
      mockTagsService.setTask("task.md", "/path/to/task.md", frontmatter);

      const command = createGetCommand(i18n);
      await command.parse(["task.md", "status"]);

      assertEquals(capturedOutput.length, 1);
      assertEquals(capturedOutput[0], "in_progress");
    });

    it("should get array property", async () => {
      const frontmatter: FrontMatter = {
        date: "2025-07-24",
        created: "2025-07-24T10:00:00Z",
        tags: ["feature", "urgent", "backend"],
      };
      mockTagsService.setTask("task.md", "/path/to/task.md", frontmatter);

      const command = createGetCommand(i18n);
      await command.parse(["task.md", "tags"]);

      assertEquals(capturedOutput.length, 1);
      const output = JSON.parse(capturedOutput[0]);
      assertEquals(output, ["feature", "urgent", "backend"]);
    });

    it("should get custom property", async () => {
      const frontmatter: FrontMatter = {
        date: "2025-07-24",
        created: "2025-07-24T10:00:00Z",
        assignee: "alice",
        estimate: 5.5,
        completed: false,
      } as any;
      mockTagsService.setTask("task.md", "/path/to/task.md", frontmatter);

      const command = createGetCommand(i18n);
      await command.parse(["task.md", "assignee"]);
      assertEquals(capturedOutput[0], "alice");

      capturedOutput = [];
      await command.parse(["task.md", "estimate"]);
      assertEquals(capturedOutput[0], "5.5");

      capturedOutput = [];
      await command.parse(["task.md", "completed"]);
      assertEquals(capturedOutput[0], "false");
    });

    it("should output JSON for object values", async () => {
      const frontmatter: FrontMatter = {
        date: "2025-07-24",
        created: "2025-07-24T10:00:00Z",
        metadata: { version: 1, author: "bob" },
      } as any;
      mockTagsService.setTask("task.md", "/path/to/task.md", frontmatter);

      const command = createGetCommand(i18n);
      await command.parse(["task.md", "metadata"]);

      assertEquals(capturedOutput.length, 1);
      const output = JSON.parse(capturedOutput[0]);
      assertEquals(output.version, 1);
      assertEquals(output.author, "bob");
    });

    it("should handle file not found error", async () => {
      let errorThrown = false;
      let errorMessage = "";
      try {
        const command = createGetCommand(i18n);
        await command.parse(["missing.md", "status"]);
      } catch (e: any) {
        errorThrown = true;
        errorMessage = e.message;
      }

      assertEquals(errorThrown, true);
      assertStringIncludes(errorMessage, "missing.md");
      assertStringIncludes(errorMessage, "not found");
    });

    it("should handle property not found error", async () => {
      const frontmatter: FrontMatter = {
        date: "2025-07-24",
        created: "2025-07-24T10:00:00Z",
      };
      mockTagsService.setTask("task.md", "/path/to/task.md", frontmatter);

      let errorThrown = false;
      let errorMessage = "";
      try {
        const command = createGetCommand(i18n);
        await command.parse(["task.md", "nonexistent"]);
      } catch (e: any) {
        errorThrown = true;
        errorMessage = e.message;
      }

      assertEquals(errorThrown, true);
      assertStringIncludes(errorMessage, "nonexistent");
      assertStringIncludes(errorMessage, "not found");
    });

    it("should use JSON output with --json flag", async () => {
      const frontmatter: FrontMatter = {
        date: "2025-07-24",
        created: "2025-07-24T10:00:00Z",
        status: "done",
      };
      mockTagsService.setTask("task.md", "/path/to/task.md", frontmatter);

      const command = createGetCommand(i18n);
      await command.parse(["task.md", "status", "--json"]);

      assertEquals(capturedOutput.length, 1);
      assertEquals(capturedOutput[0], '"done"');
    });
  });

  describe("get all properties", () => {
    it("should display all properties", async () => {
      const frontmatter: FrontMatter = {
        date: "2025-07-24",
        created: "2025-07-24T10:00:00Z",
        status: "todo",
        priority: "high",
        tags: ["bug", "urgent"],
        assignee: "alice",
      } as any;
      mockTagsService.setTask("task.md", "/path/to/task.md", frontmatter);

      const command = createGetCommand(i18n);
      await command.parse(["task.md"]);

      const output = capturedOutput.join("\n");
      assertStringIncludes(output, "date: 2025-07-24");
      assertStringIncludes(output, "created: 2025-07-24T10:00:00Z");
      assertStringIncludes(output, "status: todo");
      assertStringIncludes(output, "priority: high");
      assertStringIncludes(output, "tags: [bug, urgent]");
      assertStringIncludes(output, "assignee: alice");
    });

    it("should handle multiline strings", async () => {
      const frontmatter: FrontMatter = {
        date: "2025-07-24",
        created: "2025-07-24T10:00:00Z",
        description: "Line 1\nLine 2\nLine 3",
      } as any;
      mockTagsService.setTask("task.md", "/path/to/task.md", frontmatter);

      const command = createGetCommand(i18n);
      await command.parse(["task.md"]);

      const output = capturedOutput.join("\n");
      assertStringIncludes(output, "description: |");
      assertStringIncludes(output, "  Line 1");
      assertStringIncludes(output, "  Line 2");
      assertStringIncludes(output, "  Line 3");
    });

    it("should output JSON with --json flag", async () => {
      const frontmatter: FrontMatter = {
        date: "2025-07-24",
        created: "2025-07-24T10:00:00Z",
        status: "todo",
        priority: "normal",
        tags: ["feature"],
        custom_field: "value",
      } as any;
      mockTagsService.setTask("task.md", "/path/to/task.md", frontmatter);

      const command = createGetCommand(i18n);
      await command.parse(["task.md", "--json"]);

      assertEquals(capturedOutput.length, 1);
      const output = JSON.parse(capturedOutput[0]);
      assertEquals(output.date, "2025-07-24");
      assertEquals(output.status, "todo");
      assertEquals(output.priority, "normal");
      assertEquals(output.tags, ["feature"]);
      assertEquals(output.custom_field, "value");
    });

    it("should handle empty frontmatter", async () => {
      const frontmatter: FrontMatter = {
        date: "2025-07-24",
        created: "2025-07-24T10:00:00Z",
      };
      mockTagsService.setTask("task.md", "/path/to/task.md", frontmatter);

      const command = createGetCommand(i18n);
      await command.parse(["task.md"]);

      const output = capturedOutput.join("\n");
      assertStringIncludes(output, "date: 2025-07-24");
      assertStringIncludes(output, "created: 2025-07-24T10:00:00Z");
    });

    it("should show empty JSON for task with no properties and --json", async () => {
      const frontmatter = {} as FrontMatter;
      mockTagsService.setTask("task.md", "/path/to/task.md", frontmatter);

      const command = createGetCommand(i18n);
      await command.parse(["task.md", "--json"]);

      assertEquals(capturedOutput.length, 1);
      assertEquals(capturedOutput[0], "{}");
    });

    it("should show message for task with no properties", async () => {
      const frontmatter = {} as FrontMatter;
      mockTagsService.setTask("task.md", "/path/to/task.md", frontmatter);

      const command = createGetCommand(i18n);
      await command.parse(["task.md"]);

      assertEquals(capturedOutput.length, 1);
      assertStringIncludes(capturedOutput[0], "No properties set");
    });

    it("should handle task not found", async () => {
      let errorThrown = false;
      let errorMessage = "";
      try {
        const command = createGetCommand(i18n);
        await command.parse(["missing.md"]);
      } catch (e: any) {
        errorThrown = true;
        errorMessage = e.message;
      }

      assertEquals(errorThrown, true);
      assertStringIncludes(errorMessage, "missing.md");
      assertStringIncludes(errorMessage, "not found");
    });
  });

  describe("with git integration", () => {
    it("should work with --no-git flag", async () => {
      const frontmatter: FrontMatter = {
        date: "2025-07-24",
        created: "2025-07-24T10:00:00Z",
        status: "done",
      };
      mockTagsService.setTask("task.md", "/path/to/task.md", frontmatter);
      mockGitService.setRepoInfo({ owner: "user", repo: "repo", host: "github.com" });

      const command = createGetCommand(i18n);
      await command.parse(["task.md", "status", "--no-git"]);

      assertEquals(capturedOutput.length, 1);
      assertEquals(capturedOutput[0], "done");

      // Verify git service was not called when --no-git is used
      const gitCalls = mockGitService.getMethodCalls("getRepoInfo");
      assertEquals(gitCalls.length, 0);
    });

    it("should work within git repository", async () => {
      const frontmatter: FrontMatter = {
        date: "2025-07-24",
        created: "2025-07-24T10:00:00Z",
        status: "done",
      };
      mockTagsService.setTask("task.md", "/path/to/task.md", frontmatter);
      mockGitService.setRepoInfo({ owner: "user", repo: "repo", host: "github.com" });

      const command = createGetCommand(i18n);
      await command.parse(["task.md", "status"]);

      assertEquals(capturedOutput.length, 1);
      assertEquals(capturedOutput[0], "done");

      // Verify git service was called
      const gitCalls = mockGitService.getMethodCalls("getRepoInfo");
      assertEquals(gitCalls.length, 1);
    });
  });
});
