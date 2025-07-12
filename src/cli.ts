#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-run

import { Command } from "@cliffy/command";
import { createAddCommand } from "./commands/add.ts";
import { createTagsCommand } from "./commands/tags.ts";
import { createConfigCommand } from "./commands/config.ts";
import { createListCommand } from "./commands/list.ts";
import { createReadCommand } from "./commands/read.ts";
import { createPathCommand } from "./commands/path.ts";

const VERSION = "0.1.0";

async function main() {
  const command = new Command()
    .name("locus")
    .version(VERSION)
    .description("Git対応タスク管理CLIツール")
    .meta("author", "tesso57")
    .meta("license", "MIT")
    .globalOption("--json", "JSON形式で出力", { hidden: true });

  // Add commands
  command.command("add", createAddCommand());
  command.command("tags", createTagsCommand());
  command.command("config", createConfigCommand());
  command.command("list", createListCommand());
  command.command("read", createReadCommand());
  command.command("path", createPathCommand());

  // Help command
  command.command(
    "help",
    new Command()
      .description("ヘルプを表示")
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
      console.error(`エラー: ${error.message}`);
    } else {
      console.error(`エラー: ${String(error)}`);
    }
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
