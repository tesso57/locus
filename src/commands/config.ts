import { Command } from "@cliffy/command";
import { stringify } from "@std/yaml";
import { exists } from "@std/fs";
import { join } from "@std/path";
import { 
  loadConfig, 
  getConfigDir, 
  createDefaultConfig,
  findConfigFile,
} from "../config/index.ts";

export function createConfigCommand(): Command {
  return new Command()
    .name("config")
    .description("設定の管理")
    .action(() => {
      console.log("サブコマンドを指定してください。");
      console.log("使用可能なサブコマンド: show, path, init");
    })
    // show subcommand
    .command("show", "現在の設定を表示")
    .option("--json", "JSON形式で出力")
    .action(async (options) => {
      await showConfig(options.json);
    })
    // path subcommand
    .command("path", "設定ファイルのパスを表示")
    .action(async () => {
      await showConfigPath();
    })
    // init subcommand
    .command("init", "デフォルト設定ファイルを作成")
    .option("-f, --force", "既存のファイルを上書き")
    .action(async (options) => {
      await initConfig(options.force);
    });
}

async function showConfig(asJson: boolean = false): Promise<void> {
  try {
    const config = await loadConfig();
    
    if (asJson) {
      console.log(JSON.stringify(config, null, 2));
    } else {
      console.log("🔧 現在の設定:\n");
      console.log(stringify(config, {
        lineWidth: -1,
        noRefs: true,
      }));
      
      // Show source of configuration
      const configFile = await findConfigFile();
      if (configFile) {
        console.log(`\n📁 設定ファイル: ${configFile}`);
      } else {
        console.log(`\n📁 設定ファイル: なし（デフォルト設定を使用）`);
      }
      
      // Check for environment variables
      const envVars = Object.keys(Deno.env.toObject()).filter(key => key.startsWith("LOCUS_"));
      if (envVars.length > 0) {
        console.log(`\n🌍 環境変数による上書き:`);
        for (const key of envVars) {
          console.log(`  ${key}=${Deno.env.get(key)}`);
        }
      }
    }
  } catch (error) {
    console.error(`エラー: ${error.message}`);
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

async function initConfig(force: boolean = false): Promise<void> {
  const configDir = getConfigDir();
  const configPath = join(configDir, "settings.yml");
  
  try {
    if (await exists(configPath) && !force) {
      console.error(`エラー: 設定ファイルは既に存在します: ${configPath}`);
      console.error(`上書きするには --force オプションを使用してください。`);
      Deno.exit(1);
    }
    
    await createDefaultConfig();
    console.log(`✨ 設定ファイルを作成しました: ${configPath}`);
    console.log(`\n設定を編集するには、以下のコマンドを実行してください:`);
    console.log(`  $EDITOR ${configPath}`);
    
  } catch (error) {
    console.error(`エラー: ${error.message}`);
    Deno.exit(1);
  }
}