#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-run

import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.4/command/mod.ts";
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
  command.command("add", createAddCommand() as any);
  command.command("tags", createTagsCommand() as any);
  command.command("config", createConfigCommand() as any);
  command.command("list", createListCommand() as any);
  command.command("read", createReadCommand() as any);
  command.command("path", createPathCommand() as any);

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
