#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-run

import { parse } from "https://deno.land/std@0.220.0/yaml/mod.ts";
import { stringify } from "https://deno.land/std@0.220.0/yaml/stringify.ts";
import { ensureDir } from "https://deno.land/std@0.220.0/fs/mod.ts";
import { join, basename } from "https://deno.land/std@0.220.0/path/mod.ts";
import { exists } from "https://deno.land/std@0.220.0/fs/exists.ts";

// デフォルトのタスクディレクトリ
const DEFAULT_TASK_DIR = join(Deno.env.get("HOME") || "", "Documents", "Obsidian Vault", "tasks");

// gitコマンドが存在するかチェック
async function hasGit(): Promise<boolean> {
  try {
    const command = new Deno.Command("which", { args: ["git"] });
    const { success } = await command.output();
    return success;
  } catch {
    return false;
  }
}

// gitリポジトリかどうかをチェック
async function isGitRepo(): Promise<boolean> {
  if (!await hasGit()) return false;
  
  try {
    const command = new Deno.Command("git", {
      args: ["rev-parse", "--is-inside-work-tree"],
      cwd: Deno.cwd(),
    });
    const { success } = await command.output();
    return success;
  } catch {
    return false;
  }
}

// gitリポジトリのルートディレクトリを取得
async function getGitRoot(): Promise<string | null> {
  if (!await hasGit()) return null;
  
  try {
    const command = new Deno.Command("git", {
      args: ["rev-parse", "--show-toplevel"],
      cwd: Deno.cwd(),
    });
    const { stdout, success } = await command.output();
    if (!success) return null;
    return new TextDecoder().decode(stdout).trim();
  } catch {
    return null;
  }
}

// Markdownファイルのfrontmatterを解析
function parseFrontmatter(content: string): { frontmatter: Record<string, unknown> | null; body: string } {
  const lines = content.split('\n');
  
  if (lines[0] !== '---') {
    return { frontmatter: null, body: content };
  }
  
  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') {
      endIndex = i;
      break;
    }
  }
  
  if (endIndex === -1) {
    return { frontmatter: null, body: content };
  }
  
  const yamlContent = lines.slice(1, endIndex).join('\n');
  const body = lines.slice(endIndex + 1).join('\n');
  
  try {
    const frontmatter = parse(yamlContent) as Record<string, unknown>;
    return { frontmatter, body };
  } catch {
    return { frontmatter: null, body: content };
  }
}

// frontmatterとbodyを結合してMarkdownを生成
function generateMarkdown(frontmatter: Record<string, unknown> | null, body: string): string {
  if (!frontmatter || Object.keys(frontmatter).length === 0) {
    return body;
  }
  
  const yamlContent = stringify(frontmatter);
  return `---\n${yamlContent}---\n${body}`;
}

// ヘルプメッセージ表示
function showHelp(): void {
  console.log(`使用方法: task.ts <command> [arguments]

コマンド:
  add <タスクファイル名> <ファイル内容>      タスクファイルを追加
  tags list [ファイル名]                     markdownファイル一覧またはプロパティ表示
  tags get <ファイル名> <プロパティ>          特定のプロパティ値を取得
  tags add <ファイル名> <プロパティ> <値>      プロパティを追加/更新
  tags rm <ファイル名> <プロパティ>           プロパティを削除
  tags clear <ファイル名>                    全プロパティを削除
  help                                      このヘルプメッセージを表示

注: tags コマンドは ${DEFAULT_TASK_DIR} 内のファイルを操作します

例:
  task.ts add new_feature.md "新機能の実装タスク"
  task.ts tags add new_feature.md status "in-progress"`);
}

// タスクファイルを追加
async function addTask(fileName: string, content: string): Promise<void> {
  // ファイル名に.md拡張子を追加
  if (!fileName.endsWith('.md')) {
    fileName += '.md';
  }
  
  // ファイル名の安全性チェック
  if (fileName.includes('/') || fileName.includes('..')) {
    console.error("エラー: ファイル名に不正な文字（/や..）が含まれています");
    Deno.exit(2);
  }
  
  // タスクファイルを配置するディレクトリを決定
  let taskDir = DEFAULT_TASK_DIR;
  
  if (await isGitRepo()) {
    const gitRoot = await getGitRoot();
    if (gitRoot) {
      const repoName = basename(gitRoot);
      taskDir = join(DEFAULT_TASK_DIR, repoName);
      console.log(`Git repository '${repoName}' detected. Using task directory: ${taskDir}`);
    }
  } else {
    console.log("Not a git repository. Using default task directory.");
  }
  
  // ディレクトリが存在しない場合は作成
  await ensureDir(taskDir);
  
  const taskPath = join(taskDir, fileName);
  
  // ファイルが既に存在する場合の確認
  if (await exists(taskPath)) {
    console.log(`警告: ファイル '${taskPath}' は既に存在します。`);
    const answer = prompt("上書きしますか？ (y/N): ");
    if (!answer || !answer.match(/^[Yy]$/)) {
      console.log("操作をキャンセルしました。");
      return;
    }
  }
  
  // タスクファイルの内容を作成（frontmatter付き）
  const now = new Date().toISOString();
  const frontmatter = {
    created: now,
    status: "pending"
  };
  
  const fullContent = generateMarkdown(frontmatter, `${content}\n\n---\n作成日: ${new Date().toLocaleString('ja-JP')}`);
  
  // ファイルに書き込み
  await Deno.writeTextFile(taskPath, fullContent);
  
  console.log(`タスクファイルを作成しました: ${taskPath}`);
  if (await isGitRepo()) {
    const gitRoot = await getGitRoot();
    if (gitRoot) {
      const repoName = basename(gitRoot);
      console.log(`注: このファイルはgitリポジトリ '${repoName}' のタスクとして作成されました。`);
    }
  } else {
    console.log("注: このファイルはデフォルトのタスクディレクトリに作成されました。");
  }
}

// プロパティ一覧を表示
async function listProperties(filePath: string): Promise<void> {
  try {
    const content = await Deno.readTextFile(filePath);
    const { frontmatter } = parseFrontmatter(content);
    
    if (!frontmatter) {
      console.log("No frontmatter found in file");
      return;
    }
    
    console.log(`Properties in ${filePath}:`);
    for (const [key, value] of Object.entries(frontmatter)) {
      if (typeof value === 'string' && value.includes('\n')) {
        console.log(`  ${key}: |`);
        value.split('\n').forEach(line => console.log(`    ${line}`));
      } else {
        console.log(`  ${key}: ${value}`);
      }
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.error(`エラー: ファイル '${filePath}' が見つかりません`);
    } else {
      console.error(`エラー: ${error}`);
    }
    Deno.exit(1);
  }
}

// プロパティ値を取得
async function getProperty(filePath: string, property: string): Promise<void> {
  try {
    const content = await Deno.readTextFile(filePath);
    const { frontmatter } = parseFrontmatter(content);
    
    if (!frontmatter || !(property in frontmatter)) {
      Deno.exit(1);
    }
    
    console.log(frontmatter[property]);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.error(`エラー: ファイル '${filePath}' が見つかりません`);
    }
    Deno.exit(1);
  }
}

// プロパティを追加・更新
async function addProperty(filePath: string, property: string, value: string): Promise<void> {
  try {
    let content = "";
    let frontmatter: Record<string, unknown> = {};
    let body = "";
    
    // ファイルが存在する場合は読み込む
    if (await exists(filePath)) {
      content = await Deno.readTextFile(filePath);
      const parsed = parseFrontmatter(content);
      frontmatter = parsed.frontmatter || {};
      body = parsed.body;
    }
    
    // プロパティを設定
    frontmatter[property] = value;
    
    // ファイルに書き込み
    const newContent = generateMarkdown(frontmatter, body);
    await Deno.writeTextFile(filePath, newContent);
    
    console.log(`Property '${property}' added/updated in ${filePath}`);
  } catch (error) {
    console.error(`エラー: ${error}`);
    Deno.exit(1);
  }
}

// プロパティを削除
async function removeProperty(filePath: string, property: string): Promise<void> {
  try {
    const content = await Deno.readTextFile(filePath);
    const { frontmatter, body } = parseFrontmatter(content);
    
    if (!frontmatter || !(property in frontmatter)) {
      console.log(`Property '${property}' not found in ${filePath}`);
      Deno.exit(1);
    }
    
    delete frontmatter[property];
    
    const newContent = generateMarkdown(frontmatter, body);
    await Deno.writeTextFile(filePath, newContent);
    
    console.log(`Property '${property}' removed from ${filePath}`);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.error(`エラー: ファイル '${filePath}' が見つかりません`);
    } else {
      console.error(`エラー: ${error}`);
    }
    Deno.exit(1);
  }
}

// 全プロパティを削除
async function clearProperties(filePath: string): Promise<void> {
  try {
    const content = await Deno.readTextFile(filePath);
    const { body } = parseFrontmatter(content);
    
    await Deno.writeTextFile(filePath, body);
    
    console.log(`All properties cleared from ${filePath}`);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.error(`エラー: ファイル '${filePath}' が見つかりません`);
    } else {
      console.error(`エラー: ${error}`);
    }
    Deno.exit(1);
  }
}

// tagsサブコマンドの処理
async function handleTags(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.error(`使用方法: task.ts tags <subcommand> <file> [arguments]

サブコマンド:
  list [file]                    markdownファイルの全プロパティを表示（ファイル省略時は一覧表示）
  get <file> <property>          特定のプロパティの値を取得
  add <file> <property> <value>  プロパティを追加・更新
  rm <file> <property>           プロパティを削除
  clear <file>                   全プロパティを削除

注: <file>は${DEFAULT_TASK_DIR}内のmarkdownファイルを指定`);
    Deno.exit(1);
  }
  
  const subcommand = args[0];
  const remainingArgs = args.slice(1);
  
  switch (subcommand) {
    case "list":
      if (remainingArgs.length === 0) {
        // ファイル一覧を表示
        console.log(`利用可能なmarkdownファイル (${DEFAULT_TASK_DIR}):`);
        try {
          await ensureDir(DEFAULT_TASK_DIR);
          for await (const entry of Deno.readDir(DEFAULT_TASK_DIR)) {
            if (entry.isFile && entry.name.endsWith('.md')) {
              console.log(entry.name);
            }
          }
        } catch {
          console.log(`ディレクトリが存在しません: ${DEFAULT_TASK_DIR}`);
        }
      } else {
        let fileName = remainingArgs[0];
        if (!fileName.endsWith('.md')) {
          fileName += '.md';
        }
        await listProperties(join(DEFAULT_TASK_DIR, fileName));
      }
      break;
      
    case "get":
      if (remainingArgs.length < 2) {
        console.error("使用方法: task.ts tags get <file> <property>");
        Deno.exit(1);
      }
      let getFileName = remainingArgs[0];
      if (!getFileName.endsWith('.md')) {
        getFileName += '.md';
      }
      await getProperty(join(DEFAULT_TASK_DIR, getFileName), remainingArgs[1]);
      break;
      
    case "add":
      if (remainingArgs.length < 3) {
        console.error("使用方法: task.ts tags add <file> <property> <value>");
        Deno.exit(1);
      }
      let addFileName = remainingArgs[0];
      if (!addFileName.endsWith('.md')) {
        addFileName += '.md';
      }
      await addProperty(join(DEFAULT_TASK_DIR, addFileName), remainingArgs[1], remainingArgs[2]);
      break;
      
    case "rm":
      if (remainingArgs.length < 2) {
        console.error("使用方法: task.ts tags rm <file> <property>");
        Deno.exit(1);
      }
      let rmFileName = remainingArgs[0];
      if (!rmFileName.endsWith('.md')) {
        rmFileName += '.md';
      }
      await removeProperty(join(DEFAULT_TASK_DIR, rmFileName), remainingArgs[1]);
      break;
      
    case "clear":
      if (remainingArgs.length < 1) {
        console.error("使用方法: task.ts tags clear <file>");
        Deno.exit(1);
      }
      let clearFileName = remainingArgs[0];
      if (!clearFileName.endsWith('.md')) {
        clearFileName += '.md';
      }
      await clearProperties(join(DEFAULT_TASK_DIR, clearFileName));
      break;
      
    default:
      console.error(`エラー: 不明なtagsサブコマンド '${subcommand}'`);
      console.error("使用可能なサブコマンド: list, get, add, rm, clear");
      Deno.exit(1);
  }
}

// メイン処理
async function main(): Promise<void> {
  const args = Deno.args;
  
  if (args.length === 0) {
    showHelp();
    Deno.exit(0);
  }
  
  const command = args[0];
  const commandArgs = args.slice(1);
  
  switch (command) {
    case "add":
      if (commandArgs.length < 2) {
        console.error("使用方法: task.ts add <タスクファイル名> <ファイル内容>");
        console.error("例: task.ts add new_feature.md \"新機能の実装タスク\"");
        Deno.exit(1);
      }
      await addTask(commandArgs[0], commandArgs[1]);
      break;
      
    case "tags":
      await handleTags(commandArgs);
      break;
      
    case "help":
    case "--help":
    case "-h":
      showHelp();
      break;
      
    default:
      console.error(`エラー: 不明なコマンド '${command}'`);
      console.error("ヘルプを表示するには 'task.ts help' を実行してください");
      Deno.exit(1);
  }
}

// 実行
if (import.meta.main) {
  await main();
}