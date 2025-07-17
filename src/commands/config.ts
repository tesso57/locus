import { Command } from "@cliffy/command";
import { stringify } from "@std/yaml";
import { exists } from "@std/fs";
import { join } from "@std/path";
import { Confirm, Input, Number, Select } from "@cliffy/prompt";
import { createDefaultConfig, findConfigFile, getConfigDir, loadConfig } from "../config/index.ts";
import { getErrorMessage, logError } from "../utils/errors-i18n.ts";
import { output } from "./utils/command-helpers.ts";
import { I18nService } from "../services/i18n.ts";
import { Config } from "../types.ts";
import { DEFAULT_CONFIG } from "../config/defaults.ts";

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
    })
    // setup subcommand
    .command("setup", i18n.t("config.setup.description"))
    .action(async () => {
      await setupConfig(i18n);
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

async function setupConfig(i18n: I18nService): Promise<void> {
  try {
    console.log(i18n.t("config.setup.messages.welcome"));
    console.log();

    // Load current config as defaults
    const currentConfig = await loadConfig();

    // Create new config object
    const config: Config = {
      task_directory: currentConfig.task_directory,
      language: { ...currentConfig.language },
      git: { ...currentConfig.git },
      file_naming: { ...currentConfig.file_naming },
      defaults: { ...currentConfig.defaults },
    };

    // Task directory
    const taskDir = await Input.prompt({
      message: i18n.t("config.setup.messages.taskDir"),
      default: config.task_directory,
    });
    config.task_directory = taskDir;

    // Language
    const language = await Select.prompt({
      message: i18n.t("config.setup.messages.language"),
      options: [
        { value: "en", name: "English" },
        { value: "ja", name: "日本語 (Japanese)" },
      ],
      default: config.language.default,
    });
    config.language.default = language as "en" | "ja";

    // Git settings
    config.git.extract_username = await Confirm.prompt({
      message: i18n.t("config.setup.messages.gitExtract"),
      default: config.git.extract_username,
    });

    if (config.git.extract_username) {
      config.git.username_from_remote = await Confirm.prompt({
        message: i18n.t("config.setup.messages.gitRemote"),
        default: config.git.username_from_remote,
      });
    }

    // File naming pattern
    const patternOptions = [
      {
        value: "{date}-{slug}-{hash}.md",
        name: i18n.t("config.setup.messages.patternExplain.dateSlugHash"),
      },
      {
        value: "{slug}-{date}-{hash}.md",
        name: i18n.t("config.setup.messages.patternExplain.slugDateHash"),
      },
      {
        value: "{date}-{slug}.md",
        name: i18n.t("config.setup.messages.patternExplain.dateSlug"),
      },
      {
        value: "{slug}.md",
        name: i18n.t("config.setup.messages.patternExplain.slugOnly"),
      },
      {
        value: "custom",
        name: i18n.t("config.setup.messages.patternCustom"),
      },
    ];

    let pattern = await Select.prompt({
      message: i18n.t("config.setup.messages.filePattern"),
      options: patternOptions,
      default: config.file_naming.pattern,
    });

    if (pattern === "custom") {
      pattern = await Input.prompt({
        message: "Enter custom pattern:",
        default: config.file_naming.pattern,
      });
    }
    config.file_naming.pattern = pattern;

    // Date format
    const dateFormat = await Select.prompt({
      message: i18n.t("config.setup.messages.dateFormat"),
      options: [
        { value: "YYYY-MM-DD", name: "YYYY-MM-DD (2024-01-15)" },
        { value: "YYYYMMDD", name: "YYYYMMDD (20240115)" },
        { value: "YYYY/MM/DD", name: "YYYY/MM/DD (2024/01/15)" },
        { value: "DD-MM-YYYY", name: "DD-MM-YYYY (15-01-2024)" },
      ],
      default: config.file_naming.date_format,
    });
    config.file_naming.date_format = dateFormat;

    // Hash length
    const hashLength = await Number.prompt({
      message: i18n.t("config.setup.messages.hashLength"),
      default: config.file_naming.hash_length,
      min: 4,
      max: 32,
    });
    config.file_naming.hash_length = hashLength;

    // Default status
    const status = await Select.prompt({
      message: i18n.t("config.setup.messages.defaultStatus"),
      options: [
        { value: "todo", name: "TODO" },
        { value: "in-progress", name: "In Progress" },
        { value: "done", name: "Done" },
        { value: "cancelled", name: "Cancelled" },
      ],
      default: config.defaults.status,
    });
    config.defaults.status = status;

    // Default priority
    const priority = await Select.prompt({
      message: i18n.t("config.setup.messages.defaultPriority"),
      options: [
        { value: "high", name: "High" },
        { value: "normal", name: "Normal" },
        { value: "low", name: "Low" },
      ],
      default: config.defaults.priority,
    });
    config.defaults.priority = priority;

    // Default tags
    const tagsInput = await Input.prompt({
      message: i18n.t("config.setup.messages.defaultTags"),
      default: config.defaults.tags.join(", "),
    });
    config.defaults.tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    // Preview configuration
    console.log();
    console.log(i18n.t("config.setup.messages.preview"));
    console.log();
    console.log(stringify(config, {
      lineWidth: -1,
      useAnchors: false,
    }));

    // Confirm save
    const confirmSave = await Confirm.prompt({
      message: i18n.t("config.setup.messages.confirmSave"),
      default: true,
    });

    if (!confirmSave) {
      console.log(i18n.t("config.setup.messages.cancelled"));
      return;
    }

    // Save configuration
    const configDir = getConfigDir();
    const configPath = join(configDir, "settings.yml");

    // Create directory if it doesn't exist
    await Deno.mkdir(configDir, { recursive: true });

    // Write config file
    await Deno.writeTextFile(
      configPath,
      stringify(config, {
        lineWidth: -1,
        useAnchors: false,
      }),
    );

    console.log(i18n.t("config.setup.messages.saved", { path: configPath }));
  } catch (error: unknown) {
    const message = getErrorMessage(error, i18n);
    logError(message, i18n);
    Deno.exit(1);
  }
}
