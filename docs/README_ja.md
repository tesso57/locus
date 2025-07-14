# Locus

Gitリポジトリごとにタスクを整理する、Git対応のタスク管理CLIツールです。各タスクはYAMLフロントマターを含むMarkdownファイルとして保存され、Gitリポジトリごとに自動的に整理されます。

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/tesso57/locus)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## 特徴

- **Git対応の整理機能**: タスクは自動的にGitリポジトリごとに整理されます（`~/locus/<ユーザー名>/<リポジトリ名>/`）
- **Markdownベース**: タスクはYAMLフロントマターを含むMarkdownファイルとして保存されます
- **柔軟なタグ付け**: タグ、ステータス、優先度、カスタムプロパティをサポート
- **スマートなファイル命名**: 日付、スラグ、ハッシュによる自動ファイル命名
- **クロスプラットフォーム**: macOS、Linux、Windowsで動作

## インストール

### Denoを使用（推奨）

```bash
# JSRからインストール
deno install -n locus jsr:@tesso/locus

# ローカルソースからインストール
deno task install-local

# 手動でインストール
deno install --allow-read --allow-write --allow-env --allow-run -n locus -f src/cli.ts
```

### ビルド済みバイナリ

[リリースページ](https://github.com/tesso57/locus/releases)から、お使いのプラットフォーム用の最新リリースをダウンロードしてください。

## 使い方

### 新しいタスクの追加

```bash
# 基本的な使い方
locus add "認証バグの修正"

# 標準入力から本文を追加
echo "JWTトークンの検証を修正する必要があります" | locus add "認証バグの修正" -

# タグとプロパティを指定
locus add "ダークモードの実装" --tags ui,feature --priority high --status in-progress
```

### タスクの一覧表示

```bash
# 現在のリポジトリのタスクを表示
locus list

# ステータスでフィルタリング
locus list --status todo
locus list --status in_progress

# 優先度でフィルタリング
locus list --priority high

# タグでフィルタリング
locus list --tags bug,critical

# ソート
locus list --sort created    # 作成日でソート（デフォルト）
locus list --sort status     # ステータスでソート
locus list --sort priority   # 優先度でソート

# 詳細表示
locus list --detail

# 全リポジトリのタスクを表示
locus list --all

# JSON形式で出力
locus list --json
```

### タグで検索

```bash
# タグでタスクを検索
locus tags ui

# 複数タグで検索（OR演算）
locus tags ui,backend
```

### タスクの内容を読む

```bash
# タスクファイルを読む（長い内容は自動的にページャーで表示）
locus read "認証バグ修正"

# Markdownのままで表示（フロントマター含む）
locus read "ダークモード実装" --raw

# ページャーなしで表示
locus read "README更新" --pager never

# スクリプト用にJSON形式で出力
locus read "テスト追加" --json

# 絶対パスで読む
locus read /path/to/task.md
```

### タスクファイルのパスを取得

```bash
# タスクの絶対パスを取得
locus path "認証バグ修正"

# 全リポジトリから検索
locus path "機能実装" --all

# 部分的なファイル名やタイトルで検索
locus path "認証"  # ファイル名やタイトルに"認証"を含むファイルを検索

# 追加のメタデータとともにJSON形式で出力
locus path "タスク名" --json

# スクリプトや他のコマンドと組み合わせて使用
cat $(locus path "my-task")
editor $(locus path "todo-task")
```

### タスクの更新（今後実装予定）

Updateコマンドは将来のリリースで実装予定です。既存のタスクプロパティを変更できるようになります。

### 設定

```bash
# 現在の設定を表示
locus config

# 設定値を変更
locus config set task_directory "~/my-tasks"
locus config set defaults.status "backlog"
locus config set git.extract_username false
```

## 設定ファイル

設定は `~/.config/locus/settings.yml` に保存されます（XDG Base Directory仕様に準拠）：

```yaml
# タスク保存ディレクトリ
task_directory: "~/locus"

# Git統合設定
git:
  extract_username: true
  username_from_remote: true

# ファイル命名設定
file_naming:
  pattern: "{date}-{slug}-{hash}.md"
  date_format: "YYYY-MM-DD"
  hash_length: 8

# 新規タスクのデフォルト値
defaults:
  status: "todo"
  priority: "normal"
  tags: []
```

## タスクファイルの形式

タスクはYAMLフロントマターを含むMarkdownファイルとして保存されます：

```markdown
---
date: 2024-01-15
created: 2024-01-15T10:30:00Z
tags:
  - feature
  - backend
status: in-progress
priority: high
assignee: john
---

# ユーザー認証の実装

APIエンドポイントにJWTベースの認証を追加する。

## 要件
- [ ] ログインエンドポイント
- [ ] トークンリフレッシュ機能
- [ ] ログアウト機能
```

## 開発

### 前提条件

- [Deno](https://deno.com/) >= 2.0

### セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/tesso57/locus.git
cd locus

# 開発モードで実行
deno task dev

# テストを実行
deno task test

# バイナリをビルド
deno task compile
```

### 利用可能なタスク

- `deno task dev` - 開発モードで実行
- `deno task test` - カバレッジ付きでテストを実行
- `deno task lint` - リンターを実行
- `deno task fmt` - コードをフォーマット
- `deno task check` - フォーマットチェック、リント、テストを実行
- `deno task compile` - 全プラットフォーム用のバイナリをビルド
- `deno task install-local` - ローカルに 'locus' コマンドとしてインストール

### 直接実行

タスクを使わずにCLIを直接実行することもできます：

```bash
# denoで実行
deno run --allow-all src/cli.ts

# npxで実行（npmでDenoがインストールされている場合）
npx deno run --allow-all src/cli.ts

# JSRから直接実行
deno run jsr:@tesso/locus

# JSRからnpxで実行
npx @tesso/locus
```

## ライセンス

このプロジェクトはMITライセンスの下でライセンスされています。詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 作者

[tesso57](https://github.com/tesso57)