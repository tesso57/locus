# Locus - Task Management CLI Tool Specification

## 概要

Locusは、Markdown形式のタスクファイルを管理するためのDeno製CLIツールです。Gitリポジトリを認識し、リポジトリごとにタスクを整理できます。

## プロジェクト構造

```
locus/
├── deno.json          # Denoプロジェクト設定
├── src/
│   ├── cli.ts         # CLIエントリーポイント
│   ├── mod.ts         # ライブラリエクスポート
│   ├── commands/      # コマンド実装
│   │   ├── add.ts     # タスク追加コマンド
│   │   └── tags.ts    # タグ管理コマンド
│   ├── utils/         # ユーティリティ関数
│   │   ├── git.ts     # Git関連機能
│   │   └── markdown.ts # Markdown/frontmatter解析
│   └── types.ts       # TypeScript型定義
├── test/              # テストファイル
│   ├── add_test.ts
│   ├── tags_test.ts
│   └── utils_test.ts
├── examples/          # 使用例
│   └── basic.md
├── README.md          # プロジェクトドキュメント
├── LICENSE            # MITライセンス
└── .github/
    └── workflows/
        └── ci.yml     # GitHub Actions CI設定
```

## 詳細仕様

### 1. deno.json

```json
{
  "name": "@username/locus",
  "version": "0.1.0",
  "exports": {
    ".": "./src/mod.ts",
    "./cli": "./src/cli.ts"
  },
  "imports": {
    "@std/": "https://deno.land/std@0.224.0/",
    "@cliffy/command": "https://deno.land/x/cliffy@v1.0.0-rc.4/command/mod.ts",
    "@std/yaml": "https://deno.land/std@0.224.0/yaml/mod.ts",
    "@std/fs": "https://deno.land/std@0.224.0/fs/mod.ts",
    "@std/path": "https://deno.land/std@0.224.0/path/mod.ts"
  },
  "tasks": {
    "dev": "deno run --allow-read --allow-write --allow-env --allow-run src/cli.ts",
    "test": "deno test --allow-read --allow-write --allow-env --allow-run --coverage",
    "lint": "deno lint",
    "fmt": "deno fmt",
    "check": "deno fmt --check && deno lint && deno test --allow-read --allow-write --allow-env --allow-run",
    "compile": "deno compile --allow-read --allow-write --allow-env --allow-run -o locus src/cli.ts",
    "install-local": "deno install --allow-read --allow-write --allow-env --allow-run -n locus -f src/cli.ts"
  },
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "target": "ES2022",
    "lib": ["deno.ns", "deno.unstable"]
  },
  "lint": {
    "include": ["src/", "test/"],
    "exclude": ["examples/"],
    "rules": {
      "tags": ["recommended"],
      "include": ["ban-untagged-todo"],
      "exclude": ["no-unused-vars"]
    }
  },
  "fmt": {
    "include": ["src/", "test/", "*.md", "*.json"],
    "exclude": ["examples/"],
    "options": {
      "useTabs": false,
      "lineWidth": 100,
      "indentWidth": 2,
      "singleQuote": false,
      "proseWrap": "preserve"
    }
  }
}
```

### 2. src/types.ts

```typescript
// Task file related types
export interface TaskConfig {
  taskDir: string;
  repoName?: string;
}

export interface FrontMatter {
  [key: string]: unknown;
  created?: string;
  status?: string;
  tags?: string[];
  priority?: string;
}

export interface ParsedMarkdown {
  frontmatter: FrontMatter | null;
  body: string;
}

// Command options
export interface AddOptions {
  fileName: string;
  content: string;
  force?: boolean;
}

export interface TagsListOptions {
  fileName?: string;
}

export interface TagsGetOptions {
  fileName: string;
  property: string;
}

export interface TagsSetOptions {
  fileName: string;
  property: string;
  value: string;
}

export interface TagsRemoveOptions {
  fileName: string;
  property: string;
}

export interface TagsClearOptions {
  fileName: string;
}

// Git related types
export interface GitInfo {
  isRepo: boolean;
  root?: string;
  repoName?: string;
}
```

### 3. src/utils/git.ts

```typescript
import { GitInfo } from "../types.ts";

/**
 * Check if git command is available
 */
export async function hasGit(): Promise<boolean> {
  try {
    const command = new Deno.Command("which", { args: ["git"] });
    const { success } = await command.output();
    return success;
  } catch {
    return false;
  }
}

/**
 * Check if current directory is inside a git repository
 */
export async function isGitRepo(): Promise<boolean> {
  if (!await hasGit()) return false;

  try {
    const command = new Deno.Command("git", {
      args: ["rev-parse", "--is-inside-work-tree"],
      stdout: "piped",
      stderr: "null",
    });
    const { success } = await command.output();
    return success;
  } catch {
    return false;
  }
}

/**
 * Get git repository root directory
 */
export async function getGitRoot(): Promise<string | null> {
  if (!await hasGit()) return null;

  try {
    const command = new Deno.Command("git", {
      args: ["rev-parse", "--show-toplevel"],
      stdout: "piped",
      stderr: "null",
    });
    const { stdout, success } = await command.output();
    if (!success) return null;
    return new TextDecoder().decode(stdout).trim();
  } catch {
    return null;
  }
}

/**
 * Get git repository information
 */
export async function getGitInfo(): Promise<GitInfo> {
  const isRepo = await isGitRepo();
  if (!isRepo) {
    return { isRepo: false };
  }

  const root = await getGitRoot();
  if (!root) {
    return { isRepo: false };
  }

  const repoName = root.split("/").pop() || "";
  return {
    isRepo: true,
    root,
    repoName,
  };
}
```

### 4. src/utils/markdown.ts

```typescript
import { parse, stringify } from "@std/yaml";
import { FrontMatter, ParsedMarkdown } from "../types.ts";

/**
 * Parse markdown content with frontmatter
 */
export function parseMarkdown(content: string): ParsedMarkdown {
  const lines = content.split("\n");

  if (lines[0] !== "---") {
    return { frontmatter: null, body: content };
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return { frontmatter: null, body: content };
  }

  const yamlContent = lines.slice(1, endIndex).join("\n");
  const body = lines.slice(endIndex + 1).join("\n");

  try {
    const frontmatter = parse(yamlContent) as FrontMatter;
    return { frontmatter, body };
  } catch {
    return { frontmatter: null, body: content };
  }
}

/**
 * Generate markdown content with frontmatter
 */
export function generateMarkdown(
  frontmatter: FrontMatter | null,
  body: string,
): string {
  if (!frontmatter || Object.keys(frontmatter).length === 0) {
    return body;
  }

  const yamlContent = stringify(frontmatter).trim();
  return `---\n${yamlContent}\n---\n${body}`;
}

/**
 * Ensure filename has .md extension
 */
export function ensureMarkdownExtension(fileName: string): string {
  return fileName.endsWith(".md") ? fileName : `${fileName}.md`;
}

/**
 * Validate filename for security
 */
export function validateFileName(fileName: string): void {
  if (fileName.includes("/") || fileName.includes("..")) {
    throw new Error("ファイル名に不正な文字（/や..）が含まれています");
  }
}
```

### 5. src/commands/add.ts

```typescript
import { Command } from "@cliffy/command";
import { join } from "@std/path";
import { ensureDir, exists } from "@std/fs";
import { AddOptions, FrontMatter } from "../types.ts";
import { getGitInfo } from "../utils/git.ts";
import { ensureMarkdownExtension, generateMarkdown, validateFileName } from "../utils/markdown.ts";

const DEFAULT_TASK_DIR = join(
  Deno.env.get("HOME") || "",
  "Documents",
  "Obsidian Vault",
  "tasks",
);

export function createAddCommand(): Command {
  return new Command()
    .name("add")
    .description("タスクファイルを追加")
    .arguments("<fileName:string> <content:string>")
    .option("-f, --force", "既存ファイルを上書き")
    .action(async (options, fileName: string, content: string) => {
      await addTask({
        fileName,
        content,
        force: options.force,
      });
    });
}

async function addTask(options: AddOptions): Promise<void> {
  const fileName = ensureMarkdownExtension(options.fileName);

  try {
    validateFileName(fileName);
  } catch (error) {
    console.error(`エラー: ${error.message}`);
    Deno.exit(2);
  }

  // Determine task directory
  const gitInfo = await getGitInfo();
  let taskDir = DEFAULT_TASK_DIR;

  if (gitInfo.isRepo && gitInfo.repoName) {
    taskDir = join(DEFAULT_TASK_DIR, gitInfo.repoName);
    console.log(`Git repository '${gitInfo.repoName}' detected. Using task directory: ${taskDir}`);
  } else {
    console.log("Not a git repository. Using default task directory.");
  }

  // Ensure directory exists
  await ensureDir(taskDir);

  const taskPath = join(taskDir, fileName);

  // Check if file exists
  if (await exists(taskPath) && !options.force) {
    console.log(`警告: ファイル '${taskPath}' は既に存在します。`);
    const answer = prompt("上書きしますか？ (y/N): ");
    if (!answer || !answer.match(/^[Yy]$/)) {
      console.log("操作をキャンセルしました。");
      return;
    }
  }

  // Create task content with frontmatter
  const now = new Date().toISOString();
  const frontmatter: FrontMatter = {
    created: now,
    status: "pending",
  };

  const body = `${options.content}\n\n---\n作成日: ${
    new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
  }`;

  const fullContent = generateMarkdown(frontmatter, body);

  // Write file
  await Deno.writeTextFile(taskPath, fullContent);

  console.log(`タスクファイルを作成しました: ${taskPath}`);
  if (gitInfo.isRepo && gitInfo.repoName) {
    console.log(
      `注: このファイルはgitリポジトリ '${gitInfo.repoName}' のタスクとして作成されました。`,
    );
  } else {
    console.log("注: このファイルはデフォルトのタスクディレクトリに作成されました。");
  }
}
```

### 6. src/commands/tags.ts

```typescript
import { Command } from "@cliffy/command";
import { join } from "@std/path";
import { ensureDir, exists } from "@std/fs";
import {
  FrontMatter,
  TagsClearOptions,
  TagsGetOptions,
  TagsListOptions,
  TagsRemoveOptions,
  TagsSetOptions,
} from "../types.ts";
import { ensureMarkdownExtension, generateMarkdown, parseMarkdown } from "../utils/markdown.ts";

const DEFAULT_TASK_DIR = join(
  Deno.env.get("HOME") || "",
  "Documents",
  "Obsidian Vault",
  "tasks",
);

export function createTagsCommand(): Command {
  return new Command()
    .name("tags")
    .description("markdownファイルのプロパティ管理")
    .action(() => {
      console.log("サブコマンドを指定してください。");
      console.log("使用可能なサブコマンド: list, get, add, rm, clear");
    })
    // list subcommand
    .command("list", "markdownファイルの全プロパティを表示")
    .arguments("[fileName:string]")
    .action(async (_, fileName?: string) => {
      await listTags({ fileName });
    })
    // get subcommand
    .command("get", "特定のプロパティの値を取得")
    .arguments("<fileName:string> <property:string>")
    .action(async (_, fileName: string, property: string) => {
      await getTag({ fileName, property });
    })
    // add subcommand
    .command("add", "プロパティを追加・更新")
    .alias("set")
    .arguments("<fileName:string> <property:string> <value:string>")
    .action(async (_, fileName: string, property: string, value: string) => {
      await setTag({ fileName, property, value });
    })
    // rm subcommand
    .command("rm", "プロパティを削除")
    .alias("remove")
    .arguments("<fileName:string> <property:string>")
    .action(async (_, fileName: string, property: string) => {
      await removeTag({ fileName, property });
    })
    // clear subcommand
    .command("clear", "全プロパティを削除")
    .arguments("<fileName:string>")
    .action(async (_, fileName: string) => {
      await clearTags({ fileName });
    });
}

async function listTags(options: TagsListOptions): Promise<void> {
  if (!options.fileName) {
    // List all markdown files
    console.log(`利用可能なmarkdownファイル (${DEFAULT_TASK_DIR}):`);
    try {
      await ensureDir(DEFAULT_TASK_DIR);
      const files: string[] = [];
      for await (const entry of Deno.readDir(DEFAULT_TASK_DIR)) {
        if (entry.isFile && entry.name.endsWith(".md")) {
          files.push(entry.name);
        }
      }
      files.sort().forEach((file) => console.log(file));
    } catch {
      console.log(`ディレクトリが存在しません: ${DEFAULT_TASK_DIR}`);
    }
    return;
  }

  const fileName = ensureMarkdownExtension(options.fileName);
  const filePath = join(DEFAULT_TASK_DIR, fileName);

  try {
    const content = await Deno.readTextFile(filePath);
    const { frontmatter } = parseMarkdown(content);

    if (!frontmatter) {
      console.log("No frontmatter found in file");
      return;
    }

    console.log(`Properties in ${fileName}:`);
    for (const [key, value] of Object.entries(frontmatter)) {
      if (typeof value === "string" && value.includes("\n")) {
        console.log(`  ${key}: |`);
        value.split("\n").forEach((line) => console.log(`    ${line}`));
      } else if (Array.isArray(value)) {
        console.log(`  ${key}: [${value.join(", ")}]`);
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

async function getTag(options: TagsGetOptions): Promise<void> {
  const fileName = ensureMarkdownExtension(options.fileName);
  const filePath = join(DEFAULT_TASK_DIR, fileName);

  try {
    const content = await Deno.readTextFile(filePath);
    const { frontmatter } = parseMarkdown(content);

    if (!frontmatter || !(options.property in frontmatter)) {
      Deno.exit(1);
    }

    console.log(frontmatter[options.property]);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.error(`エラー: ファイル '${filePath}' が見つかりません`);
    }
    Deno.exit(1);
  }
}

async function setTag(options: TagsSetOptions): Promise<void> {
  const fileName = ensureMarkdownExtension(options.fileName);
  const filePath = join(DEFAULT_TASK_DIR, fileName);

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

    frontmatter[options.property] = parsedValue;

    const newContent = generateMarkdown(frontmatter, body);
    await Deno.writeTextFile(filePath, newContent);

    console.log(`Property '${options.property}' added/updated in ${fileName}`);
  } catch (error) {
    console.error(`エラー: ${error.message}`);
    Deno.exit(1);
  }
}

async function removeTag(options: TagsRemoveOptions): Promise<void> {
  const fileName = ensureMarkdownExtension(options.fileName);
  const filePath = join(DEFAULT_TASK_DIR, fileName);

  try {
    const content = await Deno.readTextFile(filePath);
    const { frontmatter, body } = parseMarkdown(content);

    if (!frontmatter || !(options.property in frontmatter)) {
      console.log(`Property '${options.property}' not found in ${fileName}`);
      Deno.exit(1);
    }

    delete frontmatter[options.property];

    const newContent = generateMarkdown(frontmatter, body);
    await Deno.writeTextFile(filePath, newContent);

    console.log(`Property '${options.property}' removed from ${fileName}`);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.error(`エラー: ファイル '${filePath}' が見つかりません`);
    } else {
      console.error(`エラー: ${error.message}`);
    }
    Deno.exit(1);
  }
}

async function clearTags(options: TagsClearOptions): Promise<void> {
  const fileName = ensureMarkdownExtension(options.fileName);
  const filePath = join(DEFAULT_TASK_DIR, fileName);

  try {
    const content = await Deno.readTextFile(filePath);
    const { body } = parseMarkdown(content);

    await Deno.writeTextFile(filePath, body);

    console.log(`All properties cleared from ${fileName}`);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.error(`エラー: ファイル '${filePath}' が見つかりません`);
    } else {
      console.error(`エラー: ${error.message}`);
    }
    Deno.exit(1);
  }
}
```

### 7. src/cli.ts

```typescript
#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-run

import { Command } from "@cliffy/command";
import { createAddCommand } from "./commands/add.ts";
import { createTagsCommand } from "./commands/tags.ts";

const VERSION = "0.1.0";

async function main() {
  const command = new Command()
    .name("locus")
    .version(VERSION)
    .description("Markdown形式のタスクファイルを管理するCLIツール")
    .meta("author", "Your Name")
    .meta("license", "MIT")
    .globalOption("--json", "Output in JSON format", { hidden: true })
    .command("add", createAddCommand())
    .command("tags", createTagsCommand())
    .command(
      "help",
      new Command()
        .description("ヘルプを表示")
        .action(() => command.showHelp()),
    );

  try {
    await command.parse(Deno.args);
  } catch (error) {
    console.error(`エラー: ${error.message}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
```

### 8. src/mod.ts

```typescript
// Library exports for programmatic usage
export * from "./types.ts";
export * from "./utils/git.ts";
export * from "./utils/markdown.ts";

// Re-export command creation functions for extensibility
export { createAddCommand } from "./commands/add.ts";
export { createTagsCommand } from "./commands/tags.ts";
```

### 9. test/add_test.ts

```typescript
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { exists } from "@std/fs";
import { join } from "@std/path";
import { parseMarkdown } from "../src/utils/markdown.ts";

const TEST_DIR = await Deno.makeTempDir();

Deno.test("add command creates task file with frontmatter", async () => {
  const fileName = "test-task.md";
  const content = "Test task content";
  const filePath = join(TEST_DIR, fileName);

  // Run add command
  const command = new Deno.Command(Deno.execPath(), {
    args: [
      "run",
      "--allow-read",
      "--allow-write",
      "--allow-env",
      "src/cli.ts",
      "add",
      fileName,
      content,
    ],
    env: {
      HOME: TEST_DIR,
    },
  });

  const { success } = await command.output();
  assertEquals(success, true);

  // Check file exists
  assertExists(await exists(filePath));

  // Check content
  const fileContent = await Deno.readTextFile(filePath);
  const { frontmatter, body } = parseMarkdown(fileContent);

  assertEquals(frontmatter?.status, "pending");
  assert(frontmatter?.created);
  assert(body.includes(content));
});

// Cleanup
Deno.test("cleanup", () => {
  Deno.removeSync(TEST_DIR, { recursive: true });
});
```

### 10. test/tags_test.ts

```typescript
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { join } from "@std/path";
import { generateMarkdown } from "../src/utils/markdown.ts";

const TEST_DIR = await Deno.makeTempDir();
const TEST_FILE = join(TEST_DIR, "test.md");

Deno.test({
  name: "tags add command adds property to file",
  async fn() {
    // Create test file
    const content = generateMarkdown({ status: "pending" }, "Test content");
    await Deno.writeTextFile(TEST_FILE, content);

    // Run tags add command
    const command = new Deno.Command(Deno.execPath(), {
      args: [
        "run",
        "--allow-read",
        "--allow-write",
        "src/cli.ts",
        "tags",
        "add",
        "test.md",
        "priority",
        "high",
      ],
      env: {
        HOME: TEST_DIR,
      },
    });

    const { success } = await command.output();
    assertEquals(success, true);

    // Check property was added
    const updatedContent = await Deno.readTextFile(TEST_FILE);
    assert(updatedContent.includes("priority: high"));
  },
});
```

### 11. README.md

````markdown
# Locus

Markdown形式のタスクファイルを管理するためのCLIツール。

## インストール

### Deno経由でのインストール

```bash
deno install --allow-read --allow-write --allow-env --allow-run \
  -n locus \
  https://raw.githubusercontent.com/username/locus/main/src/cli.ts
```
````

### ローカル開発

```bash
git clone https://github.com/username/locus.git
cd locus
deno task install-local
```

## 使用方法

### タスクの追加

```bash
# 基本的な使用方法
locus add "機能実装" "ユーザー認証機能を実装する"

# .md拡張子は自動的に追加される
locus add feature-auth "認証機能の実装"

# 既存ファイルの上書き
locus add --force existing-task "更新された内容"
```

### タグ（プロパティ）の管理

```bash
# 利用可能なファイル一覧
locus tags list

# ファイルのプロパティ一覧
locus tags list my-task

# プロパティの追加・更新
locus tags add my-task priority high
locus tags add my-task tags '["bug", "urgent"]'

# プロパティの取得
locus tags get my-task priority

# プロパティの削除
locus tags rm my-task priority

# 全プロパティの削除
locus tags clear my-task
```

## 機能

- Gitリポジトリ認識: リポジトリごとにタスクを整理
- YAMLフロントマター: メタデータ管理
- 自動タイムスタンプ: 作成日時の自動記録
- 柔軟なプロパティ管理: JSON形式での複雑な値の保存も可能

## 開発

```bash
# 開発実行
deno task dev

# テスト
deno task test

# リント・フォーマット
deno task check

# コンパイル
deno task compile
```

## ライセンス

MIT

```
### 12. LICENSE
```

MIT License

Copyright (c) 2024 [Your Name]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

````
### 13. .github/workflows/ci.yml

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - uses: denoland/setup-deno@v1
      with:
        deno-version: v1.x
    
    - name: Format Check
      run: deno fmt --check
    
    - name: Lint
      run: deno lint
    
    - name: Type Check
      run: deno check src/cli.ts
    
    - name: Test
      run: deno test --allow-read --allow-write --allow-env --allow-run --coverage
    
    - name: Generate Coverage Report
      run: deno coverage --lcov > coverage.lcov
    
    - name: Upload Coverage
      uses: codecov/codecov-action@v3
      with:
        file: coverage.lcov

  compile:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    
    steps:
    - uses: actions/checkout@v4
    
    - uses: denoland/setup-deno@v1
      with:
        deno-version: v1.x
    
    - name: Compile
      run: deno compile --allow-read --allow-write --allow-env --allow-run -o locus-${{ matrix.os }} src/cli.ts
    
    - name: Upload Artifact
      uses: actions/upload-artifact@v3
      with:
        name: locus-${{ matrix.os }}
        path: locus-${{ matrix.os }}*
````

## 実装のポイント

1. **モジュール性**: 各機能を独立したモジュールに分割し、テストとメンテナンスを容易に
2. **型安全性**: TypeScriptの厳格な型定義により、実行時エラーを防止
3. **エラーハンドリング**: 適切なエラーメッセージと終了コード
4. **クロスプラットフォーム**: Windows、macOS、Linuxで動作
5. **拡張性**: 新しいコマンドやプロパティタイプを簡単に追加可能

この仕様書に基づいて、別ディレクトリで`locus`プロジェクトを作成できます。
