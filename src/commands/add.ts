import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.4/command/mod.ts";
import { join } from "https://deno.land/std@0.224.0/path/mod.ts";
import { exists } from "https://deno.land/std@0.224.0/fs/mod.ts";
import { AddOptions, FrontMatter } from "../types.ts";
import { getRepoInfo } from "../utils/git.ts";
import { createTaskMarkdown, validateFileName } from "../utils/markdown.ts";
import { resolveTaskDir } from "../utils/path.ts";
import { generateFileName } from "../utils/filename.ts";
import { loadConfig } from "../config/index.ts";

export function createAddCommand(): Command {
  return new Command()
    .name("add")
    .description("新しいタスクを追加")
    .arguments("<title:string>")
    .option("-b, --body <body:string>", "タスクの本文")
    .option("-t, --tags <tags:string[]>", "タグ（カンマ区切り）")
    .option("-p, --priority <priority:string>", "優先度")
    .option("-s, --status <status:string>", "ステータス")
    .option("--no-git", "Git情報を使用しない")
    .action(async (options, title: string) => {
      await addTask({
        title,
        body: options.body,
        tags: options.tags,
        priority: options.priority,
        status: options.status,
      }, !options.git);
    });
}

async function addTask(options: AddOptions, noGit: boolean = false): Promise<void> {
  try {
    // Get repository information
    const repoInfo = noGit ? null : await getRepoInfo();

    // Resolve task directory
    const taskDir = await resolveTaskDir(repoInfo);

    // Generate filename
    const fileName = await generateFileName(options.title);

    // Validate filename
    validateFileName(fileName);

    const taskPath = join(taskDir, fileName);

    // Check if file already exists
    if (await exists(taskPath)) {
      console.error(`エラー: ファイル '${taskPath}' は既に存在します`);
      Deno.exit(1);
    }

    // Load config for defaults
    const config = await loadConfig();

    // Create frontmatter
    const frontmatter: FrontMatter = {
      ...config.defaults,
    };

    if (options.tags && options.tags.length > 0) {
      frontmatter.tags = options.tags;
    }

    if (options.priority) {
      frontmatter.priority = options.priority;
    }

    if (options.status) {
      frontmatter.status = options.status;
    }

    // Create task content
    const content = createTaskMarkdown(
      options.title,
      options.body,
      frontmatter,
    );

    // Write file
    await Deno.writeTextFile(taskPath, content);

    // Success message
    console.log(`✨ タスクを作成しました: ${taskPath}`);

    if (repoInfo) {
      console.log(`📁 リポジトリ: ${repoInfo.owner}/${repoInfo.repo}`);
    } else if (!noGit) {
      console.log(`📁 場所: デフォルトのタスクディレクトリ`);
    }

    // Show task details
    console.log(`\n📋 タスク詳細:`);
    console.log(`  タイトル: ${options.title}`);
    console.log(`  ファイル名: ${fileName}`);
    console.log(`  ステータス: ${frontmatter.status}`);
    console.log(`  優先度: ${frontmatter.priority}`);
    if (frontmatter.tags && frontmatter.tags.length > 0) {
      console.log(`  タグ: ${frontmatter.tags.join(", ")}`);
    }
  } catch (error) {
    console.error(`エラー: ${error.message}`);
    Deno.exit(1);
  }
}
