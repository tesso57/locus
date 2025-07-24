import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { createGetCommand } from "../../src/commands/get.ts";
import { createMockContainer } from "../mocks/mock-container.ts";
import { createI18n } from "../../src/services/i18n.ts";
import { FrontMatter } from "../../src/types.ts";
import { TaskNotFoundError, PropertyNotFoundError } from "../../src/utils/errors.ts";
import { ok, err } from "../../src/utils/result.ts";
import { parseArgs } from "@cliffy/command";

describe("get command", () => {
  const i18nResult = createI18n("en");
  const i18n = i18nResult.ok ? i18nResult.value : (() => {
    throw new Error("Failed to create i18n");
  })();

  it("should get single property", async () => {
    const mockContainer = createMockContainer();
    const getCommand = createGetCommand(i18n);

    // Mock tags service behavior
    mockContainer.mockTagsService.getTag = async ({ fileName, property }) => {
      if (fileName === "task.md" && property === "status") {
        return ok("done");
      }
      return err(new PropertyNotFoundError(property));
    };

    let consoleOutput = "";
    const originalLog = console.log;
    console.log = (msg: string) => {
      consoleOutput += msg + "\n";
    };

    try {
      const { args, options } = await parseArgs(getCommand, ["task.md", "status"]);
      const action = getCommand.getAction();
      
      if (action) {
        await action(options, ...args);
      }

      // Verify output
      assertEquals(consoleOutput.trim(), "done");
    } finally {
      console.log = originalLog;
    }
  });

  it("should get all properties when no property specified", async () => {
    const mockContainer = createMockContainer();
    const getCommand = createGetCommand(i18n);

    const mockFrontmatter: FrontMatter = {
      date: "2024-01-15",
      created: "2024-01-15T10:00:00Z",
      status: "in_progress",
      priority: "high",
      tags: ["feature", "urgent"],
      assignee: "alice",
    };

    // Mock tags service behavior
    mockContainer.mockTagsService.listTags = async ({ fileName }) => {
      if (fileName === "task.md") {
        return ok([{
          path: "task.md",
          frontmatter: mockFrontmatter,
        }]);
      }
      return ok([]);
    };

    let consoleOutput = "";
    const originalLog = console.log;
    console.log = (msg: string) => {
      consoleOutput += msg + "\n";
    };

    try {
      const { args, options } = await parseArgs(getCommand, ["task.md"]);
      const action = getCommand.getAction();
      
      if (action) {
        await action(options, ...args);
      }

      // Verify output contains all properties
      assertEquals(consoleOutput.includes("date: 2024-01-15"), true);
      assertEquals(consoleOutput.includes("status: in_progress"), true);
      assertEquals(consoleOutput.includes("priority: high"), true);
      assertEquals(consoleOutput.includes("tags: [feature, urgent]"), true);
      assertEquals(consoleOutput.includes("assignee: alice"), true);
    } finally {
      console.log = originalLog;
    }
  });

  it("should output JSON when --json flag is used", async () => {
    const mockContainer = createMockContainer();
    const getCommand = createGetCommand(i18n);

    const mockFrontmatter: FrontMatter = {
      date: "2024-01-15",
      status: "done",
      priority: "low",
    };

    // Mock tags service behavior
    mockContainer.mockTagsService.listTags = async ({ fileName }) => {
      if (fileName === "task.md") {
        return ok([{
          path: "task.md",
          frontmatter: mockFrontmatter,
        }]);
      }
      return ok([]);
    };

    let consoleOutput = "";
    const originalLog = console.log;
    console.log = (msg: string) => {
      consoleOutput += msg;
    };

    try {
      const { args, options } = await parseArgs(getCommand, ["task.md", "--json"]);
      const action = getCommand.getAction();
      
      if (action) {
        await action(options, ...args);
      }

      // Verify JSON output
      const parsed = JSON.parse(consoleOutput);
      assertEquals(parsed.date, "2024-01-15");
      assertEquals(parsed.status, "done");
      assertEquals(parsed.priority, "low");
    } finally {
      console.log = originalLog;
    }
  });

  it("should handle file not found error", async () => {
    const mockContainer = createMockContainer();
    const getCommand = createGetCommand(i18n);

    mockContainer.mockTagsService.getTag = async ({ fileName }) => {
      return err(new TaskNotFoundError(fileName));
    };

    let exitCode = 0;
    const originalExit = Deno.exit;
    Deno.exit = (code?: number) => {
      exitCode = code || 0;
      throw new Error("exit");
    };

    try {
      const { args, options } = await parseArgs(getCommand, ["missing.md", "status"]);
      const action = getCommand.getAction();
      
      if (action) {
        await action(options, ...args);
      }
    } catch (e) {
      if (e instanceof Error && e.message !== "exit") {
        throw e;
      }
    } finally {
      Deno.exit = originalExit;
    }

    assertEquals(exitCode, 1);
  });

  it("should handle property not found error", async () => {
    const mockContainer = createMockContainer();
    const getCommand = createGetCommand(i18n);

    mockContainer.mockTagsService.getTag = async ({ property }) => {
      return err(new PropertyNotFoundError(property));
    };

    let exitCode = 0;
    const originalExit = Deno.exit;
    Deno.exit = (code?: number) => {
      exitCode = code || 0;
      throw new Error("exit");
    };

    try {
      const { args, options } = await parseArgs(getCommand, ["task.md", "nonexistent"]);
      const action = getCommand.getAction();
      
      if (action) {
        await action(options, ...args);
      }
    } catch (e) {
      if (e instanceof Error && e.message !== "exit") {
        throw e;
      }
    } finally {
      Deno.exit = originalExit;
    }

    assertEquals(exitCode, 1);
  });

  it("should handle empty properties", async () => {
    const mockContainer = createMockContainer();
    const getCommand = createGetCommand(i18n);

    // Mock tags service behavior - return empty frontmatter
    mockContainer.mockTagsService.listTags = async ({ fileName }) => {
      if (fileName === "task.md") {
        return ok([{
          path: "task.md",
          frontmatter: {},
        }]);
      }
      return ok([]);
    };

    let consoleOutput = "";
    const originalLog = console.log;
    console.log = (msg: string) => {
      consoleOutput += msg + "\n";
    };

    try {
      const { args, options } = await parseArgs(getCommand, ["task.md"]);
      const action = getCommand.getAction();
      
      if (action) {
        await action(options, ...args);
      }

      // Verify output shows no properties
      assertEquals(consoleOutput.includes("No properties set"), true);
    } finally {
      console.log = originalLog;
    }
  });
});