// CLI export without shebang for DNT
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
import { formatError } from "./utils/errors-i18n.ts";

const VERSION = "0.1.0";

export async function main() {
  // Initialize i18n
  let i18n: I18nService;
  try {
    // Load config to get language preference
    const configResult = await loadConfig();
    const lang = configResult.ok ? configResult.value.language.default : "ja";

    // Check for language override from environment or CLI args
    const envLang = Deno.env.get("LOCUS_LANG") ||
      Deno.env.get("LANG")?.split(".")[0].split("_")[0].toLowerCase();
    const langOverride = envLang && ["ja", "en"].includes(envLang) ? envLang : lang;

    const i18nResult = createI18n(langOverride);
    if (!i18nResult.ok) {
      throw i18nResult.error;
    }
    i18n = i18nResult.value;
  } catch (error) {
    console.error("Failed to initialize i18n:", error);
    Deno.exit(1);
  }

  const command = new Command()
    .name("locus")
    .version(VERSION)
    .description(i18n.t("cli.description"))
    .meta("author", "tesso57")
    .meta("license", "MIT")
    .globalOption("--json", i18n.t("cli.json.description"), { hidden: true });

  // Add commands
  command.command("add", createAddCommand(i18n));
  command.command("tags", createTagsCommand(i18n));
  command.command("config", createConfigCommand(i18n));
  command.command("list", createListCommand(i18n));
  command.command("read", createReadCommand(i18n));
  command.command("path", createPathCommand(i18n));

  // Help command
  command.command(
    "help",
    new Command()
      .description(i18n.t("cli.help.description"))
      .action(() => {
        command.showHelp();
      }),
  );

  try {
    // If no arguments provided, show help
    if (Deno.args.length === 0) {
      command.showHelp();
      Deno.exit(0);
    }

    await command.parse(Deno.args);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(formatError(error, i18n));
    } else {
      console.error(formatError(String(error), i18n));
    }
    Deno.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  await main();
}