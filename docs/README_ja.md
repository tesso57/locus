# Locus

[![Version](https://img.shields.io/badge/version-0.1.2-blue.svg)](https://github.com/tesso57/locus)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![CI](https://github.com/tesso57/locus/actions/workflows/ci.yml/badge.svg)](https://github.com/tesso57/locus/actions/workflows/ci.yml)
[![Deno](https://img.shields.io/badge/Deno-2.x-000000?logo=deno)](https://deno.com)
[![JSR](https://jsr.io/badges/@tesso/locus)](https://jsr.io/@tesso/locus)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey)](https://github.com/tesso57/locus)

_Locus_ は、特に**AIコーディングアシスタント**との連携を念頭に設計された、Git対応のローカルファーストなタスク管理CLIツールです。

**シンプルでローカルなGitHub Issues**と考えてください。複雑な作業を小さな管理しやすいMarkdownファイルに分割し、それらをAIエージェントに一つずつ提供することで、大規模なリファクタリングやテスト生成などのタスクで、より自律的で高品質な結果を得ることができます。

もちろん、公式のプロジェクトボードを煩雑にすることなく、日々のタスクを管理するための優れたツールとしても使用できます。

[English README](../README.md)

## ユースケース

<details>
<summary>AI支援開発ワークフロー</summary>

_Locus_ はAI支援開発ワークフローに最適です。複雑な作業を明確に定義された一連のタスクに分割することで、AIに大規模または反復的な作業をより効果的に実行させることができます。

_Locus_ とAIアシスタントを使用したテストファイル生成の一般的なワークフローは次のとおりです：

### 1. タスクテンプレートの作成

まず、タスクの汎用テンプレートを作成します。このテンプレートには `$FILE_NAME` のようなプレースホルダーを含めることができます。

**`test_template.md`**:

```markdown
# $FILE_NAME のテストを作成

- [ ] `docs/testing.md` を読んで、テスト戦略を理解する
- [ ] リポジトリ全体をスキャンして、プロジェクトのコンテキストを把握する
- [ ] `$FILE_NAME` のコードを読んで、その責務と目的を理解する
- [ ] 上記に基づいて、`$FILE_NAME` の新しいテストファイルを作成する
- [ ] ファイル内の各関数について、正常系とエッジケースのテストケースを作成する
- [ ] `docs/testing.md` の観点から作成したテストをレビューし、改善する
- [ ] 最後に、`gh` コマンドを使用してプルリクエストを作成する
```

### 2. _Locus_ でタスクを一括生成

次に、シンプルなシェルスクリプトを使用して、対象としたいすべてのファイルに対してタスクを生成します。

```bash
# srcディレクトリ内のすべての.tsファイルに対してタスクを生成
for FILE in src/**/*.ts; do
  # テンプレート内のプレースホルダーを実際のファイル名に置換
  TASK_BODY=$(sed "s/\\$FILE_NAME/$FILE/g" test_template.md)
  
  # --bodyオプションを使用して`locus add`でタスクを作成
  locus add "$FILE のテストを作成" --tags test,autogen --body "$TASK_BODY"
done
```

### 3. エージェントにタスクを提供

これで明確に定義されたタスクのリストができました。これらを一つずつお好みのAIエージェントに渡すことができます。

```bash
# 特定のタスクの内容を取得し、エージェントにパイプ
locus read "src-services-user-service.ts-のテストを作成" | your-ai-agent
```

この方法により、AIエージェントに実行ごとに狭く明確に定義されたスコープを提供でき、出力の一貫性と信頼性の向上に役立ちます。

</details>

## 特徴

- **Git対応の整理機能**: タスクは自動的にGitリポジトリごとに整理されます（`~/locus/<ユーザー名>/<リポジトリ名>/`）
- **Markdownベース**: タスクはYAMLフロントマターを含むMarkdownファイルとして保存されます
- **柔軟なタグ付け**: タグ、ステータス、優先度、カスタムプロパティをサポート
- **スマートなファイル命名**: 日付、スラグ、ハッシュによる自動ファイル命名
- **タスクプロパティ管理**: ファイルを編集せずにタグ、ステータス、優先度を更新
- **JSON出力**: スクリプティングや自動化のための機械可読出力
- **国際化**: 英語と日本語インターフェースの完全サポート
- **クロスプラットフォーム**: macOS、Linux、Windowsで動作

## インストール

### Denoを使用

```bash
# JSRからインストール
deno install -g -A -n locus jsr:@tesso/locus
```

### NPM/NPXを使用

```bash
# インストールせずに実行
npx @tesso/locus --version
```

## 使い方

```
コマンド:

  add     <title>     - 新しいタスクを追加
  list                - タスクを一覧表示
  tags                - タスクファイルのプロパティを管理
  config              - 設定を管理
  read    <fileName>  - タスクの内容を表示（フルパス対応）
  path    <fileName>  - タスクファイルの絶対パスを表示
  help                - ヘルプを表示
```

<details>
<summary>コマンドの例</summary>

### 新しいタスクの追加

```bash
# 基本的な使い方
locus add "認証バグの修正"

# コマンド置換を使用して本文を追加
TASK_BODY="JWTトークンの検証を修正する必要があります"
locus add "認証バグの修正" --body "$TASK_BODY"

# 本文を直接指定
locus add "バグ修正" --body "バグ修正の詳細"

# タグとプロパティを指定
locus add "ダークモードの実装" --tags ui,feature --priority high --status in-progress

# Gitコンテキストなしでタスクを作成
locus add "個人的なタスク" --no-git

# タスク情報をJSONとして出力
locus add "新機能" --json
```

### タスクの一覧表示

```bash
# 現在のリポジトリのタスクを表示
locus list

# ステータスでフィルタリング
locus list --status todo
locus list --status in-progress
locus list --status done

# 優先度でフィルタリング
locus list --priority high
locus list --priority normal
locus list --priority low

# タグでフィルタリング
locus list --tags bug,critical

# タスクをソート
locus list --sort created    # 作成日でソート（デフォルト）
locus list --sort status     # ステータスでソート
locus list --sort priority   # 優先度でソート
locus list --sort title      # タイトルでソート

# リポジトリごとにグループ化
locus list --group-by-repo

# 詳細表示
locus list --detail

# 全リポジトリのタスクを表示
locus list --all

# JSONとして出力
locus list --json
```

### tagsコマンドでタスクプロパティを管理

```bash
# すべてのタスクファイルを一覧表示
locus tags list

# 特定のファイルのプロパティを表示
locus tags list "fix-auth-bug"

# 特定のプロパティを取得
locus tags get "fix-auth-bug" status

# プロパティを設定/更新
locus tags set "fix-auth-bug" status done
locus tags set "fix-auth-bug" priority high

# プロパティを削除
locus tags rm "fix-auth-bug" assignee

# すべてのプロパティをクリア
locus tags clear "fix-auth-bug"
```

### タスク内容を読む

```bash
# タスクファイルを読む（長い内容は自動的にページャーで表示）
locus read "fix-auth-bug"

# 生のMarkdownを表示（フロントマター含む）
locus read "implement-dark-mode" --raw

# ページャーなしで表示
locus read "update-readme" --pager never

# 特定のページャーを使用
locus read "long-task" --pager less

# 色付き出力を無効化
locus read "task" --no-color

# スクリプティング用にJSONとして出力
locus read "add-tests" --json

# 絶対パスで読む
locus read /path/to/task.md
```

### タスクファイルパスを検索

```bash
# タスクの絶対パスを取得
locus path "fix-auth-bug"

# すべてのリポジトリからタスクを検索
locus path "implement-feature" --all

# 部分的なファイル名やタイトルで検索
locus path "auth"  # 名前やタイトルに"auth"を含むファイルを検索

# 追加のメタデータと共にJSONで出力
locus path "task-name" --json

# Gitコンテキストなしで動作
locus path "task" --no-git

# スクリプトや他のコマンドで使用
cat $(locus path "my-task")
editor $(locus path "todo-task")
```


### 設定

```bash
# 現在の設定を表示
locus config show
locus config show --json  # JSON出力

# 設定ファイルパスを表示
locus config path

# 設定ファイルを初期化
locus config init
locus config init --force  # 既存の設定を上書き
```

### 言語設定

Locusは英語と日本語の両方のインターフェースをサポートしています。言語は複数の方法で設定できます：

```bash
# 環境変数で言語を設定（最優先）
export LOCUS_LANG=en  # または日本語の場合は "ja"
locus add "New task"

# 設定ファイルで言語を設定
locus config init
# ~/.config/locus/settings.yml を編集し、language.default を "en" または "ja" に設定

# 言語検出の優先順位：
# 1. LOCUS_LANG 環境変数
# 2. 設定ファイルの設定
# 3. システムの LANG 環境変数
# 4. デフォルトで日本語 ("ja")
```

### 出力形式

ほとんどのコマンドはスクリプティングや自動化のために `--json` フラグでJSON出力をサポートしています：

```bash
locus add "task" --json
locus list --json
locus read "task" --json
locus path "task" --json
locus config show --json
```

</details>

## 設定

設定は `~/.config/locus/settings.yml` に保存されます（XDG Base Directory仕様に準拠）。

詳細な設定ドキュメントについては、以下を参照してください：
- **[設定ガイド](configuration_ja.md)** - 完全な設定リファレンス
- **[Configuration Guide](configuration.md)** - 英語版設定ガイド

### 設定例

```yaml
# タスク保存ディレクトリ
task_directory: "~/locus"

# 言語設定
language:
  default: "ja" # 利用可能: "ja" (日本語) または "en" (英語)

# Git統合設定
git:
  extract_username: true
  username_from_remote: true

# ファイル命名設定
file_naming:
  pattern: "{slug}.md"
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

## ドキュメント

- **[設定ガイド](configuration_ja.md)** - Locusの設定に関する包括的なガイド
- **[Configuration Guide](configuration.md)** - Configuration guide in English
- **[English README](../README.md)** - English version of this README

## ライセンス

このプロジェクトはMITライセンスの下でライセンスされています。詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 作者

[tesso57](https://github.com/tesso57)