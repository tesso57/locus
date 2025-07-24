import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { createSetCommand } from "../../src/commands/set.ts";
import { createMockContainer } from "../mocks/mock-container.ts";
import { createI18n } from "../../src/services/i18n.ts";
import { FrontMatter } from "../../src/types.ts";
import { TaskNotFoundError } from "../../src/utils/errors.ts";
import { ok, err } from "../../src/utils/result.ts";
import { parseArgs } from "@cliffy/command";

describe("set command", () => {
  const i18nResult = createI18n("en");
  const i18n = i18nResult.ok ? i18nResult.value : (() => {
    throw new Error("Failed to create i18n");
  })();

  it("should set single property", async () => {
    const mockContainer = createMockContainer();
    const setCommand = createSetCommand(i18n);

    // Mock tags service behavior
    mockContainer.mockTagsService.setTag = async ({ fileName, property, value }) => {
      if (fileName === "task.md" && property === "status" && value === "done") {
        return ok(undefined);
      }
      return err(new TaskNotFoundError(fileName));
    };

    const { args, options } = await parseArgs(setCommand, ["task.md", "status=done"]);
    const action = setCommand.getAction();
    
    if (action) {
      await action(options, ...args);
    }

    // Verify the tag was set
    const setCalls = mockContainer.mockTagsService.getMethodCalls("setTag");
    assertEquals(setCalls.length, 1);
    assertEquals(setCalls[0], { fileName: "task.md", property: "status", value: "done" });
  });

  it("should set multiple properties", async () => {
    const mockContainer = createMockContainer();
    const setCommand = createSetCommand(i18n);

    const setCalls: Array<{fileName: string; property: string; value: unknown}> = [];
    mockContainer.mockTagsService.setTag = async ({ fileName, property, value }) => {
      setCalls.push({ fileName, property, value });
      return ok(undefined);
    };

    const { args, options } = await parseArgs(setCommand, ["task.md", "status=done", "priority=high", "assignee=alice"]);
    const action = setCommand.getAction();
    
    if (action) {
      await action(options, ...args);
    }

    // Verify all properties were set
    assertEquals(setCalls.length, 3);
    assertEquals(setCalls[0], { fileName: "task.md", property: "status", value: "done" });
    assertEquals(setCalls[1], { fileName: "task.md", property: "priority", value: "high" });
    assertEquals(setCalls[2], { fileName: "task.md", property: "assignee", value: "alice" });
  });

  it("should parse boolean values", async () => {
    const mockContainer = createMockContainer();
    const setCommand = createSetCommand(i18n);

    const setCalls: Array<{fileName: string; property: string; value: unknown}> = [];
    mockContainer.mockTagsService.setTag = async ({ fileName, property, value }) => {
      setCalls.push({ fileName, property, value });
      return ok(undefined);
    };

    const { args, options } = await parseArgs(setCommand, ["task.md", "urgent=true", "archived=false"]);
    const action = setCommand.getAction();
    
    if (action) {
      await action(options, ...args);
    }

    // Verify boolean parsing
    assertEquals(setCalls.length, 2);
    assertEquals(setCalls[0], { fileName: "task.md", property: "urgent", value: true });
    assertEquals(setCalls[1], { fileName: "task.md", property: "archived", value: false });
  });

  it("should parse number values", async () => {
    const mockContainer = createMockContainer();
    const setCommand = createSetCommand(i18n);

    const setCalls: Array<{fileName: string; property: string; value: unknown}> = [];
    mockContainer.mockTagsService.setTag = async ({ fileName, property, value }) => {
      setCalls.push({ fileName, property, value });
      return ok(undefined);
    };

    const { args, options } = await parseArgs(setCommand, ["task.md", "estimate=5.5", "count=42"]);
    const action = setCommand.getAction();
    
    if (action) {
      await action(options, ...args);
    }

    // Verify number parsing
    assertEquals(setCalls.length, 2);
    assertEquals(setCalls[0], { fileName: "task.md", property: "estimate", value: 5.5 });
    assertEquals(setCalls[1], { fileName: "task.md", property: "count", value: 42 });
  });

  it("should parse array values", async () => {
    const mockContainer = createMockContainer();
    const setCommand = createSetCommand(i18n);

    const setCalls: Array<{fileName: string; property: string; value: unknown}> = [];
    mockContainer.mockTagsService.setTag = async ({ fileName, property, value }) => {
      setCalls.push({ fileName, property, value });
      return ok(undefined);
    };

    const { args, options } = await parseArgs(setCommand, ["task.md", "tags=bug,feature,urgent"]);
    const action = setCommand.getAction();
    
    if (action) {
      await action(options, ...args);
    }

    // Verify array parsing
    assertEquals(setCalls.length, 1);
    assertEquals(setCalls[0], { fileName: "task.md", property: "tags", value: ["bug", "feature", "urgent"] });
  });

  it("should parse date patterns", async () => {
    const mockContainer = createMockContainer();
    const setCommand = createSetCommand(i18n);

    const setCalls: Array<{fileName: string; property: string; value: unknown}> = [];
    mockContainer.mockTagsService.setTag = async ({ fileName, property, value }) => {
      setCalls.push({ fileName, property, value });
      return ok(undefined);
    };

    const { args, options } = await parseArgs(setCommand, ["task.md", "due=tomorrow", "start=today"]);
    const action = setCommand.getAction();
    
    if (action) {
      await action(options, ...args);
    }

    // Verify date parsing (dates should be ISO strings)
    assertEquals(setCalls.length, 2);
    const dueValue = setCalls[0].value;
    const startValue = setCalls[1].value;
    
    // Check that values are ISO date strings
    assertEquals(typeof dueValue, "string");
    assertEquals(typeof startValue, "string");
    // Due date should be later than start date
    const dueDate = new Date(dueValue as string);
    const startDate = new Date(startValue as string);
    assertEquals(dueDate > startDate, true);
  });

  it("should handle file not found error", async () => {
    const mockContainer = createMockContainer();
    const setCommand = createSetCommand(i18n);

    mockContainer.mockTagsService.setTag = async ({ fileName }) => {
      return err(new TaskNotFoundError(fileName));
    };

    let exitCode = 0;
    const originalExit = Deno.exit;
    Deno.exit = (code?: number) => {
      exitCode = code || 0;
      throw new Error("exit");
    };

    try {
      const { args, options } = await parseArgs(setCommand, ["missing.md", "status=done"]);
      const action = setCommand.getAction();
      
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
});