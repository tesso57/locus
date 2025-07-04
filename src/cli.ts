#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-run

import { Command } from "@cliffy/command";
import { createAddCommand } from "./commands/add.ts";
import { createTagsCommand } from "./commands/tags.ts";
import { createConfigCommand } from "./commands/config.ts";

const VERSION = "0.1.0";

async function main() {
  const command = new Command()
    .name("locus")
    .version(VERSION)
    .description("Git対応タスク管理CLIツール")
    .meta("author", "tesso57")
    .meta("license", "MIT")
    .globalOption("--json", "JSON形式で出力", { hidden: true })
    // Main commands
    .command("add", createAddCommand())
    .command("tags", createTagsCommand())
    .command("config", createConfigCommand());

  // Help command
  command.command("help", new Command()
    .description("ヘルプを表示")
    .action(() => {
      command.showHelp();
    })
  );

  // Default action shows help
  command.action(() => {
    command.showHelp();
  });

  try {
    await command.parse(Deno.args);
  } catch (error) {
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