import { Command } from "@cliffy/command";
import { join } from "@std/path";
import { exists } from "@std/fs";
import { 
  TagsListOptions, 
  TagsGetOptions, 
  TagsSetOptions,
  TagsRemoveOptions,
  TagsClearOptions,
  FrontMatter,
} from "../types.ts";
import { 
  ensureMarkdownExtension, 
  parseMarkdown, 
  generateMarkdown,
  mergeFrontmatter,
} from "../utils/markdown.ts";
import { getTaskBaseDir, getTaskFiles, findTaskFile } from "../utils/path.ts";
import { getRepoInfo } from "../utils/git.ts";

export function createTagsCommand(): Command {
  return new Command()
    .name("tags")
    .description("タスクファイルのプロパティ管理")
    .action(() => {
      console.log("サブコマンドを指定してください。");
      console.log("使用可能なサブコマンド: list, get, set, rm, clear");
    })
    // list subcommand
    .command("list", "タスクファイルまたはプロパティの一覧を表示")
    .arguments("[fileName:string]")
    .option("--no-git", "Git情報を使用しない")
    .action(async (options, fileName?: string) => {
      await listTags({ fileName }, !options.git);
    })
    // get subcommand
    .command("get", "特定のプロパティの値を取得")
    .arguments("<fileName:string> <property:string>")
    .option("--no-git", "Git情報を使用しない")
    .action(async (options, fileName: string, property: string) => {
      await getTag({ fileName, property }, !options.git);
    })
    // set subcommand
    .command("set", "プロパティを追加・更新")
    .alias("add")
    .arguments("<fileName:string> <property:string> <value:string>")
    .option("--no-git", "Git情報を使用しない")
    .action(async (options, fileName: string, property: string, value: string) => {
      await setTag({ fileName, property, value }, !options.git);
    })
    // rm subcommand
    .command("rm", "プロパティを削除")
    .alias("remove")
    .arguments("<fileName:string> <property:string>")
    .option("--no-git", "Git情報を使用しない")
    .action(async (options, fileName: string, property: string) => {
      await removeTag({ fileName, property }, !options.git);
    })
    // clear subcommand
    .command("clear", "全プロパティを削除")
    .arguments("<fileName:string>")
    .option("--no-git", "Git情報を使用しない")
    .action(async (options, fileName: string) => {
      await clearTags({ fileName }, !options.git);
    });
}

async function resolveTaskFile(fileName: string, noGit: boolean): Promise<string> {
  const baseDir = await getTaskBaseDir();
  
  // Check if it's an absolute path
  if (fileName.startsWith("/")) {
    return fileName;
  }
  
  // Try to find in current repo directory if in a git repo
  if (!noGit) {
    const repoInfo = await getRepoInfo();
    if (repoInfo) {
      const repoDir = join(baseDir, repoInfo.owner, repoInfo.repo);
      const found = await findTaskFile(repoDir, fileName);
      if (found) return found;
    }
  }
  
  // Try to find in base directory
  const found = await findTaskFile(baseDir, fileName);
  if (found) return found;
  
  // If not found, construct path
  const withExt = ensureMarkdownExtension(fileName);
  return join(baseDir, withExt);
}

async function listTags(options: TagsListOptions, noGit: boolean): Promise<void> {
  if (!options.fileName) {
    // List all task files
    const baseDir = await getTaskBaseDir();
    console.log(`📁 タスクファイル一覧:`);
    
    let fileCount = 0;
    for await (const filePath of getTaskFiles(baseDir)) {
      const relativePath = filePath.replace(baseDir + "/", "");
      console.log(`  ${relativePath}`);
      fileCount++;
    }
    
    if (fileCount === 0) {
      console.log("  (タスクファイルがありません)");
    } else {
      console.log(`\n合計: ${fileCount} ファイル`);
    }
    
    return;
  }
  
  const filePath = await resolveTaskFile(options.fileName, noGit);
  
  try {
    const content = await Deno.readTextFile(filePath);
    const { frontmatter } = parseMarkdown(content);
    
    if (!frontmatter || Object.keys(frontmatter).length === 0) {
      console.log("プロパティが設定されていません");
      return;
    }
    
    console.log(`📋 ${filePath} のプロパティ:`);
    for (const [key, value] of Object.entries(frontmatter)) {
      if (typeof value === "string" && value.includes("\n")) {
        console.log(`  ${key}: |`);
        value.split("\n").forEach(line => console.log(`    ${line}`));
      } else if (Array.isArray(value)) {
        console.log(`  ${key}: [${value.join(", ")}]`);
      } else if (typeof value === "object" && value !== null) {
        console.log(`  ${key}: ${JSON.stringify(value)}`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.error(`エラー: ファイル '${filePath}' が見つかりません`);
    } else {
      console.error(`エラー: ${error.message}`);
    }
    Deno.exit(1);
  }
}

async function getTag(options: TagsGetOptions, noGit: boolean): Promise<void> {
  const filePath = await resolveTaskFile(options.fileName, noGit);
  
  try {
    const content = await Deno.readTextFile(filePath);
    const { frontmatter } = parseMarkdown(content);
    
    if (!frontmatter || !(options.property in frontmatter)) {
      Deno.exit(1);
    }
    
    const value = frontmatter[options.property];
    if (typeof value === "object") {
      console.log(JSON.stringify(value, null, 2));
    } else {
      console.log(value);
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.error(`エラー: ファイル '${filePath}' が見つかりません`);
    }
    Deno.exit(1);
  }
}

async function setTag(options: TagsSetOptions, noGit: boolean): Promise<void> {
  const filePath = await resolveTaskFile(options.fileName, noGit);
  
  try {
    let content = "";
    let frontmatter: FrontMatter = {};
    let body = "";
    
    if (await exists(filePath)) {
      content = await Deno.readTextFile(filePath);
      const parsed = parseMarkdown(content);
      frontmatter = parsed.frontmatter || {};
      body = parsed.body;
    }
    
    // Try to parse value as JSON first, fallback to string
    let parsedValue: unknown = options.value;
    try {
      parsedValue = JSON.parse(options.value);
    } catch {
      // Keep as string if not valid JSON
    }
    
    frontmatter = mergeFrontmatter(frontmatter, {
      [options.property]: parsedValue,
    });
    
    const newContent = generateMarkdown(frontmatter, body);
    await Deno.writeTextFile(filePath, newContent);
    
    console.log(`✅ プロパティ '${options.property}' を更新しました`);
  } catch (error) {
    console.error(`エラー: ${error.message}`);
    Deno.exit(1);
  }
}

async function removeTag(options: TagsRemoveOptions, noGit: boolean): Promise<void> {
  const filePath = await resolveTaskFile(options.fileName, noGit);
  
  try {
    const content = await Deno.readTextFile(filePath);
    const { frontmatter, body } = parseMarkdown(content);
    
    if (!frontmatter || !(options.property in frontmatter)) {
      console.log(`プロパティ '${options.property}' は存在しません`);
      Deno.exit(1);
    }
    
    delete frontmatter[options.property];
    
    const newContent = generateMarkdown(frontmatter, body);
    await Deno.writeTextFile(filePath, newContent);
    
    console.log(`✅ プロパティ '${options.property}' を削除しました`);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.error(`エラー: ファイル '${filePath}' が見つかりません`);
    } else {
      console.error(`エラー: ${error.message}`);
    }
    Deno.exit(1);
  }
}

async function clearTags(options: TagsClearOptions, noGit: boolean): Promise<void> {
  const filePath = await resolveTaskFile(options.fileName, noGit);
  
  try {
    const content = await Deno.readTextFile(filePath);
    const { body } = parseMarkdown(content);
    
    await Deno.writeTextFile(filePath, body);
    
    console.log(`✅ 全てのプロパティを削除しました`);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.error(`エラー: ファイル '${filePath}' が見つかりません`);
    } else {
      console.error(`エラー: ${error.message}`);
    }
    Deno.exit(1);
  }
}