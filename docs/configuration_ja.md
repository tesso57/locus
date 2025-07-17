# Locus 設定ガイド

このガイドでは、設定ファイル、環境変数、対話型セットアップウィザードを含む、Locusの設定に関するすべての側面について説明します。

## 目次

- [設定の概要](#設定の概要)
- [設定ファイル](#設定ファイル)
- [環境変数](#環境変数)
- [対話型セットアップ](#対話型セットアップ)
- [設定オプション](#設定オプション)
- [設定例](#設定例)
- [トラブルシューティング](#トラブルシューティング)

## 設定の概要

Locusは3つの優先順位レベルを持つ階層的な設定システムを使用します：

1. **環境変数**（最優先）
2. **設定ファイル**（`~/.config/locus/settings.yml`）
3. **デフォルト値**（最低優先度）

これにより、以下のことが可能になります：
- 環境変数を使用して特定の設定を一時的に上書き
- 設定ファイルで永続的な設定を行う
- 設定なしでも適切なデフォルト値を使用

## 設定ファイル

### ファイルの場所

設定ファイルは以下の場所に保存されます：
- **Unix/Linux/macOS**: `~/.config/locus/settings.yml`
- **Windows**: `%USERPROFILE%\.config\locus\settings.yml`

これは[XDG Base Directory仕様](https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html)に従っています。

### 設定ファイルの作成

設定ファイルを作成する方法は3つあります：

#### 1. 対話型セットアップ（推奨）

```bash
locus config setup
```

すべての設定オプションをガイドする対話型ウィザードが起動します。

#### 2. デフォルト値で初期化

```bash
locus config init
```

デフォルト値を含む設定ファイルを作成し、手動で編集できます。

#### 3. 手動作成

ディレクトリとファイルを手動で作成：

```bash
mkdir -p ~/.config/locus
touch ~/.config/locus/settings.yml
```

その後、お好みのテキストエディタでファイルを編集します。

### ファイル形式

設定ファイルはYAML形式を使用します：

```yaml
# タスク保存ディレクトリ
task_directory: "~/locus"

# 言語設定
language:
  default: "ja"  # 利用可能: "ja"（日本語）または "en"（英語）

# Git連携設定
git:
  extract_username: true      # Git設定からユーザー名を抽出
  username_from_remote: true  # リモートURLからユーザー名を使用

# ファイル名設定
file_naming:
  pattern: "{slug}.md"                # ファイル名パターン
  date_format: "YYYY-MM-DD"           # ファイル名の日付形式
  hash_length: 8                      # ランダムハッシュの長さ

# 新規タスクのデフォルト値
defaults:
  status: "todo"      # デフォルトのタスクステータス
  priority: "normal"  # デフォルトの優先度
  tags: []           # デフォルトのタグ（空の配列）
```

## 環境変数

環境変数は設定ファイルの設定を上書きします。以下の用途に便利です：
- 一時的な設定変更
- CI/CD環境
- 異なる設定のテスト

### 利用可能な環境変数

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `LOCUS_LANG` | 言語設定を上書き | `LOCUS_LANG=ja locus list` |
| `LOCUS_TASK_DIRECTORY` | タスクディレクトリを上書き | `LOCUS_TASK_DIRECTORY=/tmp/tasks locus add "テスト"` |
| `LOCUS_GIT_EXTRACT_USERNAME` | ユーザー名抽出の有効/無効 | `LOCUS_GIT_EXTRACT_USERNAME=false locus add "タスク"` |
| `LOCUS_GIT_USERNAME_FROM_REMOTE` | リモートからのユーザー名使用の有効/無効 | `LOCUS_GIT_USERNAME_FROM_REMOTE=false locus add "タスク"` |
| `LOCUS_FILE_NAMING_PATTERN` | ファイル名パターン | `LOCUS_FILE_NAMING_PATTERN="{date}-{slug}.md" locus add "タスク"` |
| `LOCUS_FILE_NAMING_DATE_FORMAT` | ファイル名の日付形式 | `LOCUS_FILE_NAMING_DATE_FORMAT="YYYYMMDD" locus add "タスク"` |
| `LOCUS_FILE_NAMING_HASH_LENGTH` | 一意識別子のハッシュ長 | `LOCUS_FILE_NAMING_HASH_LENGTH=12 locus add "タスク"` |
| `LOCUS_DEFAULTS_STATUS` | デフォルトステータスを上書き | `LOCUS_DEFAULTS_STATUS=in-progress locus add "タスク"` |
| `LOCUS_DEFAULTS_PRIORITY` | デフォルト優先度を上書き | `LOCUS_DEFAULTS_PRIORITY=high locus add "緊急"` |
| `LOCUS_DEFAULTS_TAGS` | デフォルトタグ（カンマ区切り） | `LOCUS_DEFAULTS_TAGS="仕事,緊急" locus add "タスク"` |
| `LOCUS_LANGUAGE_DEFAULT` | デフォルト言語（en/ja） | `LOCUS_LANGUAGE_DEFAULT=en locus config show` |

### 環境変数の形式

ブール値は以下のように指定できます：
- 真: `true`、`1`、`yes`、`on`
- 偽: `false`、`0`、`no`、`off`

### 設定ディレクトリ

設定ディレクトリの場所は、標準的なXDG環境変数を使用して上書きできます：
- `XDG_CONFIG_HOME`: ベース設定ディレクトリを上書き（デフォルト: `~/.config`）
- `XDG_CONFIG_DIRS`: 検索する追加の設定ディレクトリ（デフォルト: `/etc/xdg`）

## 対話型セットアップ

対話型セットアップウィザード（`locus config setup`）は、Locusを設定するための使いやすい方法を提供します：

```bash
$ locus config setup
🚀 Locus セットアップウィザードへようこそ！

? タスクを保存するディレクトリはどこにしますか？ (~/locus) › ~/my-tasks
? どの言語を使用しますか？ › 日本語 (Japanese)
? GitのユーザーIDを自動抽出しますか？ (Y/n) › Yes
? リモートURLからユーザー名を使用しますか？ (Y/n) › Yes
? ファイル名のパターンを選択してください › {date}-{slug}-{hash}.md（例: 2024-01-15-my-task-a1b2c3d4.md）
? 日付フォーマットを選択してください › YYYY-MM-DD (2024-01-15)
? ハッシュの長さは？（4-32） › 8
? デフォルトのステータスは？ › todo
? デフォルトの優先度は？ › normal
? デフォルトのタグ（カンマ区切り、空欄可） › 

📋 設定のプレビュー:

task_directory: ~/my-tasks
language:
  default: ja
git:
  extract_username: true
  username_from_remote: true
file_naming:
  pattern: '{date}-{slug}-{hash}.md'
  date_format: YYYY-MM-DD
  hash_length: 8
defaults:
  status: todo
  priority: normal
  tags: []

? この設定を保存しますか？ (Y/n) › Yes
✅ 設定が保存されました: /Users/username/.config/locus/settings.yml
```

## 設定オプション

### タスクディレクトリ

**キー**: `task_directory`  
**デフォルト**: `~/locus`  
**環境変数**: `LOCUS_TASK_DIRECTORY`

すべてのタスクファイルが保存されるベースディレクトリ。タスクはこのディレクトリ下でGitリポジトリごとに整理されます。

構造例：
```
~/locus/
├── github-username/
│   ├── project-a/
│   │   ├── 2024-01-15-fix-bug-a1b2c3d4.md
│   │   └── 2024-01-16-add-feature-e5f6g7h8.md
│   └── project-b/
│       └── 2024-01-17-update-docs-i9j0k1l2.md
└── default/  # Gitリポジトリ外で作成されたタスク
    └── 2024-01-18-personal-task-m3n4o5p6.md
```

### 言語設定

**キー**: `language.default`  
**デフォルト**: `en`  
**環境変数**: `LOCUS_LANG`  
**オプション**: `ja`（日本語）、`en`（英語）

すべてのコマンド出力、エラーメッセージ、プロンプトの表示言語を制御します。

言語検出の優先順位：
1. `LOCUS_LANG`環境変数
2. 設定ファイルの設定
3. システムの`LANG`環境変数
4. デフォルトは英語

### Git連携

#### ユーザー名の抽出

**キー**: `git.extract_username`  
**デフォルト**: `true`  
**環境変数**: `LOCUS_GIT_EXTRACT_USERNAME`

有効にすると、LocusはGitユーザー名を抽出してリポジトリ所有者ごとにタスクを整理します。

#### リモートからのユーザー名

**キー**: `git.username_from_remote`  
**デフォルト**: `true`

有効にすると、LocusはGitリモートURLからユーザー名を抽出します。これは、ローカルのGitユーザー名がGitHub/GitLabのユーザー名と異なる場合に便利です。

例：
- リモートURL: `https://github.com/john-doe/project.git`
- 抽出されたユーザー名: `john-doe`
- タスクの場所: `~/locus/john-doe/project/`

### ファイル名設定

#### パターン

**キー**: `file_naming.pattern`  
**デフォルト**: `{slug}.md`

利用可能なプレースホルダー：
- `{date}`: `date_format`に従ってフォーマットされた現在の日付
- `{slug}`: サニタイズされたタスクタイトル（小文字、英数字、ハイフン）
- `{hash}`: 一意性のためのランダムな英数字文字列

一般的なパターン：
- `{date}-{slug}-{hash}.md` → `2024-01-15-fix-auth-bug-a1b2c3d4.md`
- `{slug}-{date}-{hash}.md` → `fix-auth-bug-2024-01-15-a1b2c3d4.md`
- `{date}-{slug}.md` → `2024-01-15-fix-auth-bug.md`
- `{slug}.md` → `fix-auth-bug.md`

#### 日付形式

**キー**: `file_naming.date_format`  
**デフォルト**: `YYYY-MM-DD`

サポートされる形式：
- `YYYY-MM-DD` → `2024-01-15`
- `YYYYMMDD` → `20240115`
- `YYYY/MM/DD` → `2024/01/15`
- `DD-MM-YYYY` → `15-01-2024`

#### ハッシュの長さ

**キー**: `file_naming.hash_length`  
**デフォルト**: `8`  
**範囲**: 4-32

ファイル名に追加されるランダムハッシュの長さ。長いハッシュは衝突の可能性を減らします。

### デフォルトのタスクプロパティ

#### ステータス

**キー**: `defaults.status`  
**デフォルト**: `todo`  
**環境変数**: `LOCUS_DEFAULTS_STATUS`

一般的な値：
- `todo` - 未着手のタスク
- `in-progress` - 現在作業中
- `done` - 完了
- `cancelled` - 不要になった

#### 優先度

**キー**: `defaults.priority`  
**デフォルト**: `normal`  
**環境変数**: `LOCUS_DEFAULTS_PRIORITY`

一般的な値：
- `high` - 緊急タスク
- `normal` - 通常の優先度
- `low` - 後回し可能

#### タグ

**キー**: `defaults.tags`  
**デフォルト**: `[]`（空の配列）

すべての新規タスクに適用されるデフォルトタグの配列。タスクごとに上書き可能です。

例：
```yaml
defaults:
  tags: ["work", "current-sprint"]
```

## 設定例

### 開発環境の設定

```yaml
task_directory: "~/dev/tasks"
language:
  default: "ja"
git:
  extract_username: true
  username_from_remote: true
file_naming:
  pattern: "{date}-{slug}-{hash}.md"  # 衝突回避のためハッシュを含める
  date_format: "YYYYMMDD"
  hash_length: 8
defaults:
  status: "todo"
  priority: "normal"
  tags: ["dev"]
```

### チーム設定

```yaml
task_directory: "/shared/team-tasks"
language:
  default: "ja"
git:
  extract_username: false  # ユーザーごとに整理しない
  username_from_remote: false
file_naming:
  pattern: "{slug}-{hash}.md"  # ソートしやすいよう日付なし
  date_format: "YYYY-MM-DD"
  hash_length: 12  # より高い一意性のための長いハッシュ
defaults:
  status: "todo"
  priority: "normal"
  tags: ["team"]
```

### 個人タスク管理

```yaml
task_directory: "~/Documents/tasks"
language:
  default: "ja"
git:
  extract_username: false  # Git整理を使用しない
  username_from_remote: false
file_naming:
  pattern: "{date}-{slug}.md"
  date_format: "YYYY-MM-DD"
  hash_length: 8
defaults:
  status: "todo"
  priority: "normal"
  tags: ["personal"]
```

## トラブルシューティング

### 設定が読み込まれない

1. ファイルの場所を確認：
   ```bash
   locus config path
   ```

2. ファイルの存在を確認：
   ```bash
   ls -la ~/.config/locus/settings.yml
   ```

3. YAML構文を検証：
   ```bash
   locus config show
   ```

### 環境変数が機能しない

1. 変数が設定されているか確認：
   ```bash
   echo $LOCUS_LANG
   ```

2. 変数名のタイプミスを確認（`LOCUS_`で始まる必要があります）

3. ブール値が正しくフォーマットされているか確認

### 権限の問題

1. ディレクトリの権限を確認：
   ```bash
   ls -la ~/.config/locus/
   ```

2. 書き込み権限を確認：
   ```bash
   chmod 755 ~/.config/locus
   chmod 644 ~/.config/locus/settings.yml
   ```

### 設定の競合

設定が期待通りに適用されない場合：

1. すべての設定ソースを確認：
   ```bash
   locus config show
   ```

2. 環境変数の上書きを探す：
   ```bash
   env | grep LOCUS_
   ```

3. 優先順位を確認：
   - 環境変数（最優先）
   - 設定ファイル
   - デフォルト（最低優先度）

## 関連項目

- [Locus README（日本語版）](README_ja.md) - 一般的な使用方法とコマンド
- [タスクファイル形式](README_ja.md#タスクファイル形式) - タスクファイルの構造
- [コマンドリファレンス](README_ja.md#使用方法) - 利用可能なすべてのコマンド