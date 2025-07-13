import { Command } from "@cliffy/command";
import { stringify } from "@std/yaml";
import { exists } from "@std/fs";
import { join } from "@std/path";
import { createDefaultConfig, findConfigFile, getConfigDir, loadConfig } from "../config/index.ts";
import { getErrorMessage, logError } from "../utils/errors-i18n.ts";
import { output } from "./utils/command-helpers.ts";
import { I18nService } from "../services/i18n.ts";

export function createConfigCommand(i18n: I18nService): Command<any, any, any> {
  return new Command()
    .name("config")
    .description(i18n.t("config.description"))
    .action(() => {
      console.log(i18n.t("config.messages.specifySubcommand"));
      console.log(i18n.t("config.messages.availableSubcommands"));
    })
    // show subcommand
    .command("show", i18n.t("config.show.description"))
    .option("--json", i18n.t("cli.json.description"))
    .action(async (options) => {
      await showConfig(options.json, i18n);
    })
    // path subcommand
    .command("path", i18n.t("config.path.description"))
    .action(async () => {
      await showConfigPath();
    })
    // init subcommand
    .command("init", i18n.t("config.init.description"))
    .option("-f, --force", i18n.t("config.init.options.force.description"))
    .action(async (options) => {
      await initConfig(options.force, i18n);
    });
}

async function showConfig(asJson: boolean = false, i18n: I18nService): Promise<void> {
  try {
    const config = await loadConfig();
    const configFile = await findConfigFile();

    output(config, { json: asJson }, (data) => {
      let result = "🔧 現在の設定:\n\n";
      result += stringify(data, {
        lineWidth: -1,
        useAnchors: false,
      });

      // Show source of configuration
      if (configFile) {
        result += `\n📁 設定ファイル: ${configFile}`;
      } else {
        result += `\n📁 設定ファイル: なし（デフォルト設定を使用）`;
      }

      // Check for environment variables
      const envVars = Object.keys(Deno.env.toObject()).filter((key) => key.startsWith("LOCUS_"));
      if (envVars.length > 0) {
        result += `\n\n🌍 環境変数による上書き:`;
        for (const key of envVars) {
          result += `\n  ${key}=${Deno.env.get(key)}`;
        }
      }

      return result;
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error, i18n);
    logError(message, i18n);
    Deno.exit(1);
  }
}

async function showConfigPath(): Promise<void> {
  const configFile = await findConfigFile();

  if (configFile) {
    console.log(configFile);
  } else {
    const configDir = getConfigDir();
    const defaultPath = join(configDir, "settings.yml");
    console.log(`設定ファイルが見つかりません。`);
    console.log(`デフォルトの場所: ${defaultPath}`);
    console.log(`\n'locus config init' を実行して設定ファイルを作成できます。`);
  }
}

async function initConfig(force: boolean = false, i18n: I18nService): Promise<void> {
  const configDir = getConfigDir();
  const configPath = join(configDir, "settings.yml");

  try {
    if (await exists(configPath) && !force) {
      logError(i18n.t("config.messages.fileExists", { path: configPath }), i18n);
      console.error(i18n.t("config.messages.useForce"));
      Deno.exit(1);
    }

    await createDefaultConfig();
    console.log(i18n.t("common.success.configCreated", { path: configPath }));
    console.log(`\n${i18n.t("common.info.runToEdit")}`);
    console.log(`  $EDITOR ${configPath}`);
  } catch (error: unknown) {
    const message = getErrorMessage(error, i18n);
    logError(message, i18n);
    Deno.exit(1);
  }
}
