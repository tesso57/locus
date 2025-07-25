/**
 * NPM entry point for the CLI
 * This file is used by dnt to build the npm package
 */

import { Command } from "@cliffy/command";
import { createAddCommand } from "./commands/add.ts";
import { createTagsCommand } from "./commands/tags.ts";
import { createConfigCommand } from "./commands/config.ts";
import { createListCommand } from "./commands/list.ts";
import { createReadCommand } from "./commands/read.ts";
import { createPathCommand } from "./commands/path.ts";
import { logError } from "./utils/errors-i18n.ts";
import { createI18n, I18nService } from "./services/i18n.ts";
import { loadConfig } from "./config/loader.ts";
import { VERSION } from "./version.ts";
import { getErrorMessage } from "./utils/errors.ts";

export async function main() {
  // Initialize i18n
  let i18n: I18nService;
  try {
    // Load config to get language preference
    const configResult = await loadConfig();
    const lang = configResult.ok ? configResult.value.language.default : "en";

    // Check for language override from environment or CLI args
    const envLang = Deno.env.get("LOCUS_LANG") ||
      Deno.env.get("LANG")?.split(".")[0].split("_")[0].toLowerCase();
    const langOverride = envLang && ["ja", "en"].includes(envLang) ? envLang : lang;

    const i18nResult = createI18n(langOverride);
    if (!i18nResult.ok) {
      console.error("Failed to initialize i18n:", i18nResult.error);
      Deno.exit(1);
    }
    i18n = i18nResult.value;
  } catch (error) {
    console.error("Failed to initialize i18n:", error);
    Deno.exit(1);
  }

  try {
    await new Command()
      .name("locus")
      .version(VERSION)
      .description(i18n.t("commands.main.description"))
      .meta("author", "tesso57")
      .meta("license", "MIT")
      // Add commands
      .command("add", createAddCommand(i18n))
      .command("list", createListCommand(i18n))
      .command("tags", createTagsCommand(i18n))
      .command("config", createConfigCommand(i18n))
      .command("read", createReadCommand(i18n))
      .command("path", createPathCommand(i18n))
      .parse(Deno.args);
  } catch (error) {
    logError(getErrorMessage(error), i18n);
    Deno.exit(1);
  }
}
