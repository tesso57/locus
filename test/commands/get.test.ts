import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { createGetCommand } from "../../src/commands/get.ts";
import { createI18n } from "../../src/services/i18n.ts";

describe("get command", () => {
  const i18nResult = createI18n("en");
  const i18n = i18nResult.ok ? i18nResult.value : (() => {
    throw new Error("Failed to create i18n");
  })();

  it("should create get command", () => {
    const getCommand = createGetCommand(i18n);
    assertEquals(getCommand.getName(), "get");
    assertEquals(getCommand.getDescription(), "Get task properties");
  });

  it("should have correct options", () => {
    const getCommand = createGetCommand(i18n);
    const options = getCommand.getOptions();
    
    // Check that noGit and json options exist
    const hasNoGit = options.some(opt => opt.flags.includes("--no-git"));
    const hasJson = options.some(opt => opt.flags.includes("--json"));
    
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
});