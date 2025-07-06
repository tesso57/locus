# Locus

Gitリポジトリごとにタスクを整理する、Git対応のタスク管理CLIツールです。

## 特徴

- **Git対応の整理機能**: タスクは自動的にGitリポジトリごとに整理されます（`~/locus/<ユーザー名>/<リポジトリ名>/`）
- **Markdownベース**: タスクはYAMLフロントマターを含むMarkdownファイルとして保存されます
- **柔軟なタグ付け**: タグ、ステータス、優先度、カスタムプロパティをサポート
- **スマートなファイル命名**: 日付、スラグ、ハッシュによる自動ファイル命名
- **クロスプラットフォーム**: macOS、Linux、Windowsで動作

## インストール

### Denoを使用（推奨）

```bash
# グローバルインストール
deno install --allow-read --allow-write --allow-env --allow-run --name locus https://deno.land/x/locus/src/cli.ts

# ローカルソースからインストール
deno task install-local
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

### タスクの一覧と検索

```bash
# すべてのタスクを表示
locus list

# タグでフィルタリング
locus tags ui

# 複数のタグで検索（OR演算）
locus tags ui,backend

# 特定のステータスのタスクを表示
locus list --status todo
```

### タスクプロパティの更新

```bash
# 単一のプロパティを更新
locus update タスク名 --status done

# 複数のプロパティを更新
locus update タスク名 --priority low --tags bug,fixed

# 新しいタグを追加（追加モード）
locus update タスク名 --tags +security,+reviewed

# タグを削除
locus update タスク名 --tags -wip,-draft
```

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

- [Deno](https://deno.land/) >= 1.40

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

## ライセンス

このプロジェクトはMITライセンスの下でライセンスされています。詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 作者

[tesso57](https://github.com/tesso57)