import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { createSetCommand } from "../../src/commands/set.ts";
import { createI18n } from "../../src/services/i18n.ts";

describe("set command", () => {
  const i18nResult = createI18n("en");
  const i18n = i18nResult.ok ? i18nResult.value : (() => {
    throw new Error("Failed to create i18n");
  })();

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
});