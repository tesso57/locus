#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-run

import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.4/command/mod.ts";
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
    .globalOption("--json", "JSON形式で出力", { hidden: true });

  // Add commands
  command.command("add", createAddCommand() as any);
  command.command("tags", createTagsCommand() as any);
  command.command("config", createConfigCommand() as any);

  // Help command
  command.command(
    "help",
    new Command()
      .description("ヘルプを表示")
      .action(() => {
        command.showHelp();
      }),
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
