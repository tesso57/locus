import { assertEquals, assertStringIncludes } from "@std/assert";
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { createSetCommand } from "../../src/commands/set.ts";
import { createI18n } from "../../src/services/i18n.ts";
import { ServiceContainer } from "../../src/services/service-container.ts";
import { MockTagsService } from "../mocks/mock-tags-service.ts";
import { MockGitService } from "../mocks/mock-git-service.ts";
import { FrontMatter } from "../../src/types.ts";
import { Config } from "../../src/config/schema.ts";

describe("set command", () => {
  let mockTagsService: MockTagsService;
  let mockGitService: MockGitService;
  let capturedOutput: string[];
  let originalLog: typeof console.log;
  let originalError: typeof console.error;
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
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
    mockTagsService.reset();
  });

  it("should create set command", () => {
    const setCommand = createSetCommand(i18n);
    assertEquals(setCommand.getName(), "set");
    assertEquals(setCommand.getDescription(), "Set task properties flexibly");
  });

  it("should have correct options", () => {
    const setCommand = createSetCommand(i18n);
    const options = setCommand.getOptions();
    
    // Check that noGit option exists
    const hasNoGit = options.some(opt => opt.flags.includes("--no-git"));
    
    assertEquals(hasNoGit, true);
  });

  it("should accept fileName and properties arguments", () => {
    const setCommand = createSetCommand(i18n);
    const args = setCommand.getArguments();
    
    assertEquals(args.length, 2);
    assertEquals(args[0].name, "fileName");
    assertEquals(args[1].name, "properties");
  });

  describe("set properties", () => {
    it("should set single string property", async () => {
      const frontmatter: FrontMatter = {
        date: "2025-07-24",
        created: "2025-07-24T10:00:00Z",
      };
      mockTagsService.setTask("task.md", "/path/to/task.md", frontmatter);

      const command = createSetCommand(i18n);
      await command.parse(["task.md", "status=done"]);

      // Verify the tag was set
      const setCalls = mockTagsService.getMethodCalls("setTag");
      assertEquals(setCalls.length, 1);
      assertEquals(setCalls[0], {
        fileName: "task.md",
        property: "status",
        value: "done",
      });

      // Verify success message
      assertEquals(capturedOutput.length, 1);
      assertStringIncludes(capturedOutput[0], "1");
      assertStringIncludes(capturedOutput[0], "updated");
    });

    it("should set multiple properties", async () => {
      const frontmatter: FrontMatter = {
        date: "2025-07-24",
        created: "2025-07-24T10:00:00Z",
      };
      mockTagsService.setTask("task.md", "/path/to/task.md", frontmatter);

      const command = createSetCommand(i18n);
      await command.parse(["task.md", "status=in_progress", "priority=high", "assignee=alice"]);

      // Verify all properties were set
      const setCalls = mockTagsService.getMethodCalls("setTag");
      assertEquals(setCalls.length, 3);
      assertEquals(setCalls[0].property, "status");
      assertEquals(setCalls[0].value, "in_progress");
      assertEquals(setCalls[1].property, "priority");
      assertEquals(setCalls[1].value, "high");
      assertEquals(setCalls[2].property, "assignee");
      assertEquals(setCalls[2].value, "alice");

      // Verify success message
      assertEquals(capturedOutput.length, 1);
      assertStringIncludes(capturedOutput[0], "3");
      assertStringIncludes(capturedOutput[0], "updated");
    });

    it("should parse boolean values", async () => {
      const frontmatter: FrontMatter = {
        date: "2025-07-24",
        created: "2025-07-24T10:00:00Z",
      };
      mockTagsService.setTask("task.md", "/path/to/task.md", frontmatter);

      const command = createSetCommand(i18n);
      await command.parse(["task.md", "urgent=true", "archived=false", "active=TRUE", "disabled=FALSE"]);

      const setCalls = mockTagsService.getMethodCalls("setTag");
      assertEquals(setCalls.length, 4);
      assertEquals(setCalls[0].value, true);
      assertEquals(setCalls[1].value, false);
      assertEquals(setCalls[2].value, true);
      assertEquals(setCalls[3].value, false);
    });

    it("should parse number values", async () => {
      const frontmatter: FrontMatter = {
        date: "2025-07-24",
        created: "2025-07-24T10:00:00Z",
      };
      mockTagsService.setTask("task.md", "/path/to/task.md", frontmatter);

      const command = createSetCommand(i18n);
      await command.parse(["task.md", "estimate=5.5", "count=42", "temperature=-10.3"]);

      const setCalls = mockTagsService.getMethodCalls("setTag");
      assertEquals(setCalls.length, 3);
      assertEquals(setCalls[0].value, 5.5);
      assertEquals(setCalls[1].value, 42);
      assertEquals(setCalls[2].value, -10.3);
    });

    it("should parse array values", async () => {
      const frontmatter: FrontMatter = {
        date: "2025-07-24",
        created: "2025-07-24T10:00:00Z",
      };
      mockTagsService.setTask("task.md", "/path/to/task.md", frontmatter);

      const command = createSetCommand(i18n);
      await command.parse(["task.md", "tags=bug,feature,urgent", "owners=alice,bob"]);

      const setCalls = mockTagsService.getMethodCalls("setTag");
      assertEquals(setCalls.length, 2);
      assertEquals(setCalls[0].value, ["bug", "feature", "urgent"]);
      assertEquals(setCalls[1].value, ["alice", "bob"]);
    });

    it("should parse date patterns", async () => {
      const frontmatter: FrontMatter = {
        date: "2025-07-24",
        created: "2025-07-24T10:00:00Z",
      };
      mockTagsService.setTask("task.md", "/path/to/task.md", frontmatter);

      const command = createSetCommand(i18n);
      await command.parse(["task.md", "due=tomorrow", "start=today", "reminder=+3d"]);

      const setCalls = mockTagsService.getMethodCalls("setTag");
      assertEquals(setCalls.length, 3);
      
      // Check that values are ISO date strings
      const dueValue = setCalls[0].value as string;
      const startValue = setCalls[1].value as string;
      const reminderValue = setCalls[2].value as string;
      
      assertEquals(typeof dueValue, "string");
      assertEquals(typeof startValue, "string");
      assertEquals(typeof reminderValue, "string");
      
      // Check ISO format
      assertStringIncludes(dueValue, "T");
      assertStringIncludes(startValue, "T");
      assertStringIncludes(reminderValue, "T");
      
      // Due date should be later than start date
      const dueDate = new Date(dueValue);
      const startDate = new Date(startValue);
      assertEquals(dueDate > startDate, true);
    });

    it("should handle empty values", async () => {
      const frontmatter: FrontMatter = {
        date: "2025-07-24",
        created: "2025-07-24T10:00:00Z",
        description: "something",
      };
      mockTagsService.setTask("task.md", "/path/to/task.md", frontmatter);

      const command = createSetCommand(i18n);
      await command.parse(["task.md", "description="]);

      const setCalls = mockTagsService.getMethodCalls("setTag");
      assertEquals(setCalls.length, 1);
      assertEquals(setCalls[0].value, "");
    });

    it("should handle values with equals signs", async () => {
      const frontmatter: FrontMatter = {
        date: "2025-07-24",
        created: "2025-07-24T10:00:00Z",
      };
      mockTagsService.setTask("task.md", "/path/to/task.md", frontmatter);

      const command = createSetCommand(i18n);
      await command.parse(["task.md", "formula=x=y+z", "equation=a=b=c"]);

      const setCalls = mockTagsService.getMethodCalls("setTag");
      assertEquals(setCalls.length, 2);
      assertEquals(setCalls[0].value, "x=y+z");
      assertEquals(setCalls[1].value, "a=b=c");
    });

    it("should preserve string values that look like special types", async () => {
      const frontmatter: FrontMatter = {
        date: "2025-07-24",
        created: "2025-07-24T10:00:00Z",
      };
      mockTagsService.setTask("task.md", "/path/to/task.md", frontmatter);

      const command = createSetCommand(i18n);
      await command.parse(["task.md", "note=Hello, World", "id=001", "keyword=today"]);

      const setCalls = mockTagsService.getMethodCalls("setTag");
      assertEquals(setCalls.length, 3);
      // "Hello, World" becomes an array due to comma
      assertEquals(setCalls[0].value, ["Hello", "World"]);
      // "001" becomes 1 (number)
      assertEquals(setCalls[1].value, 1);
      // "today" becomes ISO date string
      assertEquals(typeof setCalls[2].value, "string");
      assertStringIncludes(setCalls[2].value as string, "T");
    });
  });

  describe("error handling", () => {
    it("should error when no properties provided", async () => {
      let errorThrown = false;
      let errorMessage = "";
      try {
        const command = createSetCommand(i18n);
        await command.parse(["task.md"]);
      } catch (e: any) {
        errorThrown = true;
        errorMessage = e.message;
      }

      assertEquals(errorThrown, true);
      assertStringIncludes(errorMessage, "No properties");
    });

    it("should error on invalid property format", async () => {
      let errorThrown = false;
      let errorMessage = "";
      try {
        const command = createSetCommand(i18n);
        await command.parse(["task.md", "invalid-format"]);
      } catch (e: any) {
        errorThrown = true;
        errorMessage = e.message;
      }

      assertEquals(errorThrown, true);
      assertStringIncludes(errorMessage, "invalid-format");
      assertStringIncludes(errorMessage, "Invalid format");
    });

    it("should error on empty key", async () => {
      let errorThrown = false;
      let errorMessage = "";
      try {
        const command = createSetCommand(i18n);
        await command.parse(["task.md", "=value"]);
      } catch (e: any) {
        errorThrown = true;
        errorMessage = e.message;
      }

      assertEquals(errorThrown, true);
      assertStringIncludes(errorMessage, "=value");
      assertStringIncludes(errorMessage, "Empty key");
    });

    it("should handle file not found error", async () => {
      let errorThrown = false;
      let errorMessage = "";
      try {
        const command = createSetCommand(i18n);
        await command.parse(["missing.md", "status=done"]);
      } catch (e: any) {
        errorThrown = true;
        errorMessage = e.message;
      }

      assertEquals(errorThrown, true);
      assertStringIncludes(errorMessage, "missing.md");
      assertStringIncludes(errorMessage, "not found");
    });

    it("should stop on first error when setting multiple properties", async () => {
      const frontmatter: FrontMatter = {
        date: "2025-07-24",
        created: "2025-07-24T10:00:00Z",
      };
      mockTagsService.setTask("task.md", "/path/to/task.md", frontmatter);
      
      // Make the second setTag call fail
      let callCount = 0;
      mockTagsService.setTag = async (options) => {
        callCount++;
        if (callCount === 2) {
          return { ok: false, error: new Error("Failed to set property") };
        }
        return { ok: true, value: undefined };
      };

      let errorThrown = false;
      try {
        const command = createSetCommand(i18n);
        await command.parse(["task.md", "status=done", "priority=high", "assignee=alice"]);
      } catch (e: any) {
        errorThrown = true;
      }

      assertEquals(errorThrown, true);
      // Only the first property should have been set
      assertEquals(callCount, 2);
    });
  });

  describe("with git integration", () => {
    it("should work with --no-git flag", async () => {
      const frontmatter: FrontMatter = {
        date: "2025-07-24",
        created: "2025-07-24T10:00:00Z",
      };
      mockTagsService.setTask("task.md", "/path/to/task.md", frontmatter);
      mockGitService.setRepoInfo({ owner: "user", repo: "repo", host: "github.com" });

      const command = createSetCommand(i18n);
      await command.parse(["task.md", "status=done", "--no-git"]);

      // Verify property was set
      const setCalls = mockTagsService.getMethodCalls("setTag");
      assertEquals(setCalls.length, 1);
      assertEquals(setCalls[0].value, "done");
      
      // Verify git service was not called when --no-git is used
      const gitCalls = mockGitService.getMethodCalls("getRepoInfo");
      assertEquals(gitCalls.length, 0);
    });

    it("should work within git repository", async () => {
      const frontmatter: FrontMatter = {
        date: "2025-07-24",
        created: "2025-07-24T10:00:00Z",
      };
      mockTagsService.setTask("task.md", "/path/to/task.md", frontmatter);
      mockGitService.setRepoInfo({ owner: "user", repo: "repo", host: "github.com" });

      const command = createSetCommand(i18n);
      await command.parse(["task.md", "status=done"]);

      // Verify property was set
      const setCalls = mockTagsService.getMethodCalls("setTag");
      assertEquals(setCalls.length, 1);

      // Verify git service was called
      const gitCalls = mockGitService.getMethodCalls("getRepoInfo");
      assertEquals(gitCalls.length, 1);
    });
  });
});