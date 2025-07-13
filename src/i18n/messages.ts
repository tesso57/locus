// Auto-generated file containing all translations
// This file is embedded in the compiled binary

export const messages = {
  ja: {
    cli: {
      description: "Git対応タスク管理CLIツール",
      help: {
        description: "ヘルプを表示",
      },
      json: {
        description: "JSON形式で出力",
      },
    },
    common: {
      error: {
        prefix: "エラー: ",
        fileNotFound: "ファイルが見つかりません: {{filename}}",
        multipleFilesFound: "複数のファイルが見つかりました:",
        homeNotSet: "HOME environment variable is not set",
        invalidRepoUrl: "Invalid repository URL: missing owner or repo name",
      },
      success: {
        taskCreated: "✨ タスクを作成しました: {{path}}",
        configCreated: "✨ 設定ファイルを作成しました: {{path}}",
      },
      info: {
        noTasks: "タスクが見つかりませんでした。",
        configNotFound: "設定ファイルが見つかりません。",
        defaultLocation: "デフォルトの場所: {{path}}",
        runToCreate: "'locus config init' を実行して設定ファイルを作成できます。",
        runToEdit: "設定を編集するには、以下のコマンドを実行してください:",
      },
    },
    add: {
      description: "新しいタスクを追加",
      options: {
        body: {
          description: "タスクの本文",
        },
        tags: {
          description: "タグ（カンマ区切り）",
        },
        priority: {
          description: "優先度",
        },
        status: {
          description: "ステータス",
        },
        noGit: {
          description: "Git情報を使用しない",
        },
        json: {
          description: "JSON形式で出力",
        },
      },
      messages: {
        repository: "📁 リポジトリ: {{repo}}",
        location: "📁 場所: デフォルトのタスクディレクトリ",
        taskDetails: "📋 タスク詳細:",
        title: "タイトル: {{title}}",
        filename: "ファイル名: {{filename}}",
        status: "ステータス: {{status}}",
        priority: "優先度: {{priority}}",
        tags: "タグ: {{tags}}",
      },
    },
    config: {
      description: "設定の管理",
      messages: {
        specifySubcommand: "サブコマンドを指定してください。",
        availableSubcommands: "使用可能なサブコマンド: show, path, init",
        currentSettings: "🔧 現在の設定:",
        configFile: "📁 設定ファイル: {{path}}",
        configFileNone: "📁 設定ファイル: なし（デフォルト設定を使用）",
        envOverrides: "🌍 環境変数による上書き:",
        fileExists: "設定ファイルは既に存在します: {{path}}",
        useForce: "上書きするには --force オプションを使用してください。",
      },
      show: {
        description: "現在の設定を表示",
      },
      path: {
        description: "設定ファイルのパスを表示",
      },
      init: {
        description: "デフォルト設定ファイルを作成",
        options: {
          force: {
            description: "既存のファイルを上書き",
          },
        },
      },
    },
    list: {
      description: "タスクの一覧を表示",
      options: {
        status: {
          description: "ステータスでフィルタ",
        },
        priority: {
          description: "優先度でフィルタ",
        },
        tags: {
          description: "タグでフィルタ（カンマ区切り）",
        },
        sort: {
          description: "ソート項目 (created, status, priority, title)",
        },
        detailed: {
          description: "詳細情報を表示",
        },
        all: {
          description: "全てのリポジトリのタスクを表示",
        },
        group: {
          description: "リポジトリごとにグループ化して表示",
        },
        json: {
          description: "JSON形式で出力",
        },
      },
      messages: {
        repository: "📁 リポジトリ: {{repo}}",
        allRepositories: "📁 全リポジトリのタスク",
        totalTasks: "📋 総タスク数: {{count}}",
        taskCount: "📋 タスク数: {{count}}",
        allTasks: "📁 全てのタスク",
        file: "ファイル: {{filename}}",
        fullPath: "フルパス: {{path}}",
        status: "ステータス: {{status}}",
        priority: "優先度: {{priority}}",
        tags: "タグ: {{tags}}",
        created: "作成日: {{date}}",
      },
      table: {
        headers: {
          title: "タイトル",
          status: "ステータス",
          priority: "優先度",
          tags: "タグ",
          created: "作成日",
        },
      },
    },
    path: {
      description: "タスクファイルの絶対パスを表示",
      options: {
        noGit: {
          description: "Git情報を使用しない",
        },
        all: {
          description: "すべてのタスクディレクトリから検索",
        },
        json: {
          description: "JSON形式で出力",
        },
      },
      errors: {
        notFound: "タスクファイルが見つかりません: {{filename}}",
        hint: "ヒント: Gitリポジトリ外の場合は --no-git オプションを使用してください",
      },
    },
    read: {
      description: "タスクの内容を表示（フルパスも対応）",
      options: {
        raw: {
          description: "マークダウンをそのまま表示",
        },
        noGit: {
          description: "Git情報を使用しない",
        },
        json: {
          description: "JSON形式で出力",
        },
        noColor: {
          description: "色なしで出力",
        },
        pager: {
          description: "ページャーを指定 (less, more, cat, never)",
        },
      },
    },
    tags: {
      description: "タスクファイルのプロパティ管理",
      messages: {
        specifySubcommand: "サブコマンドを指定してください。",
        availableSubcommands: "使用可能なサブコマンド: list, get, set, rm, clear",
        taskFileList: "📁 タスクファイル一覧:",
        noTaskFiles: "(タスクファイルがありません)",
        total: "合計: {{count}} ファイル",
        noProperties: "プロパティが設定されていません",
        properties: "📋 {{filename}} のプロパティ:",
        fileNotFound: "ファイル '{{filename}}' が見つかりません",
        propertyNotFound: "プロパティ '{{property}}' が見つかりません",
        propertyUpdated: "✅ プロパティ '{{property}}' を更新しました",
        propertyNotExists: "プロパティ '{{property}}' は存在しません",
        propertyDeleted: "✅ プロパティ '{{property}}' を削除しました",
        allPropertiesDeleted: "✅ 全てのプロパティを削除しました",
      },
      list: {
        description: "タスクファイルまたはプロパティの一覧を表示",
      },
      get: {
        description: "特定のプロパティの値を取得",
      },
      set: {
        description: "プロパティを追加・更新",
      },
      rm: {
        description: "プロパティを削除",
      },
      clear: {
        description: "全プロパティを削除",
      },
      options: {
        noGit: {
          description: "Git情報を使用しない",
        },
      },
    },
    format: {
      status: {
        todo: "⏳ TODO",
        inProgress: "🔄 進行中",
        done: "✅ 完了",
        cancelled: "❌ キャンセル",
      },
      priority: {
        high: "🔴 高",
        medium: "🟡 中",
        low: "🟢 低",
      },
      date: {
        unknown: "不明",
        today: "今日",
        yesterday: "昨日",
        daysAgo: "{{n}}日前",
        weeksAgo: "{{n}}週間前",
        monthsAgo: "{{n}}ヶ月前",
        yearsAgo: "{{n}}年前",
      },
    },
    display: {
      metadata: "📌 メタデータ:",
      file: "ファイル",
      status: "ステータス",
      priority: "優先度",
      tags: "タグ: {{tags}}",
      created: "作成日: {{date}}",
      updated: "更新日: {{date}}",
      due: "期限: {{date}}",
      repository: "リポジトリ: {{repo}}",
      customFields: "🔧 カスタムフィールド:",
      noContent: "（本文なし）",
    },
    validation: {
      filename: {
        pathSeparator: "ファイル名にパス区切り文字（/や\\）を含めることはできません",
        relativePath: "ファイル名に相対パス（..）を含めることはできません",
        empty: "ファイル名が空です",
        tooLong: "ファイル名が長すぎます（最大255文字）",
        invalidCharacters: "ファイル名に無効な文字が含まれています",
      },
    },
  },
  en: {
    cli: {
      description: "Git-aware task management CLI tool",
      help: {
        description: "Show help",
      },
      json: {
        description: "Output in JSON format",
      },
    },
    common: {
      error: {
        prefix: "Error: ",
        fileNotFound: "File not found: {{filename}}",
        multipleFilesFound: "Multiple files found:",
        homeNotSet: "HOME environment variable is not set",
        invalidRepoUrl: "Invalid repository URL: missing owner or repo name",
      },
      success: {
        taskCreated: "✨ Task created: {{path}}",
        configCreated: "✨ Config file created: {{path}}",
      },
      info: {
        noTasks: "No tasks found.",
        configNotFound: "Config file not found.",
        defaultLocation: "Default location: {{path}}",
        runToCreate: "Run 'locus config init' to create a config file.",
        runToEdit: "To edit the configuration, run the following command:",
      },
    },
    add: {
      description: "Add a new task",
      options: {
        body: {
          description: "Task body content",
        },
        tags: {
          description: "Tags (comma-separated)",
        },
        priority: {
          description: "Priority",
        },
        status: {
          description: "Status",
        },
        noGit: {
          description: "Don't use Git information",
        },
        json: {
          description: "Output in JSON format",
        },
      },
      messages: {
        repository: "📁 Repository: {{repo}}",
        location: "📁 Location: Default task directory",
        taskDetails: "📋 Task details:",
        title: "Title: {{title}}",
        filename: "Filename: {{filename}}",
        status: "Status: {{status}}",
        priority: "Priority: {{priority}}",
        tags: "Tags: {{tags}}",
      },
    },
    config: {
      description: "Manage configuration",
      messages: {
        specifySubcommand: "Please specify a subcommand.",
        availableSubcommands: "Available subcommands: show, path, init",
        currentSettings: "🔧 Current settings:",
        configFile: "📁 Config file: {{path}}",
        configFileNone: "📁 Config file: none (using defaults)",
        envOverrides: "🌍 Environment variable overrides:",
        fileExists: "Config file already exists: {{path}}",
        useForce: "Use --force option to overwrite.",
      },
      show: {
        description: "Show current configuration",
      },
      path: {
        description: "Show config file path",
      },
      init: {
        description: "Create default config file",
        options: {
          force: {
            description: "Overwrite existing file",
          },
        },
      },
    },
    list: {
      description: "List tasks",
      options: {
        status: {
          description: "Filter by status",
        },
        priority: {
          description: "Filter by priority",
        },
        tags: {
          description: "Filter by tags (comma-separated)",
        },
        sort: {
          description: "Sort by (created, status, priority, title)",
        },
        detailed: {
          description: "Show detailed information",
        },
        all: {
          description: "Show tasks from all repositories",
        },
        group: {
          description: "Group by repository",
        },
        json: {
          description: "Output in JSON format",
        },
      },
      messages: {
        repository: "📁 Repository: {{repo}}",
        allRepositories: "📁 All repositories",
        totalTasks: "📋 Total tasks: {{count}}",
        taskCount: "📋 Tasks: {{count}}",
        allTasks: "📁 All tasks",
        file: "File: {{filename}}",
        fullPath: "Full path: {{path}}",
        status: "Status: {{status}}",
        priority: "Priority: {{priority}}",
        tags: "Tags: {{tags}}",
        created: "Created: {{date}}",
      },
      table: {
        headers: {
          title: "Title",
          status: "Status",
          priority: "Priority",
          tags: "Tags",
          created: "Created",
        },
      },
    },
    path: {
      description: "Show absolute path of task file",
      options: {
        noGit: {
          description: "Don't use Git information",
        },
        all: {
          description: "Search in all task directories",
        },
        json: {
          description: "Output in JSON format",
        },
      },
      errors: {
        notFound: "Task file not found: {{filename}}",
        hint: "Hint: If outside a Git repository, use the --no-git option",
      },
    },
    read: {
      description: "Display task content (supports full paths)",
      options: {
        raw: {
          description: "Display raw markdown",
        },
        noGit: {
          description: "Don't use Git information",
        },
        json: {
          description: "Output in JSON format",
        },
        noColor: {
          description: "Output without colors",
        },
        pager: {
          description: "Specify pager (less, more, cat, never)",
        },
      },
    },
    tags: {
      description: "Manage task file properties",
      messages: {
        specifySubcommand: "Please specify a subcommand.",
        availableSubcommands: "Available subcommands: list, get, set, rm, clear",
        taskFileList: "📁 Task files:",
        noTaskFiles: "(no task files)",
        total: "Total: {{count}} files",
        noProperties: "No properties set",
        properties: "📋 Properties for {{filename}}:",
        fileNotFound: "File '{{filename}}' not found",
        propertyNotFound: "Property '{{property}}' not found",
        propertyUpdated: "✅ Property '{{property}}' updated",
        propertyNotExists: "Property '{{property}}' does not exist",
        propertyDeleted: "✅ Property '{{property}}' deleted",
        allPropertiesDeleted: "✅ All properties deleted",
      },
      list: {
        description: "List task files or properties",
      },
      get: {
        description: "Get specific property value",
      },
      set: {
        description: "Add or update property",
      },
      rm: {
        description: "Remove property",
      },
      clear: {
        description: "Remove all properties",
      },
      options: {
        noGit: {
          description: "Don't use Git information",
        },
      },
    },
    format: {
      status: {
        todo: "⏳ TODO",
        inProgress: "🔄 In Progress",
        done: "✅ Done",
        cancelled: "❌ Cancelled",
      },
      priority: {
        high: "🔴 High",
        medium: "🟡 Medium",
        low: "🟢 Low",
      },
      date: {
        unknown: "Unknown",
        today: "Today",
        yesterday: "Yesterday",
        daysAgo: "{{n}} days ago",
        weeksAgo: "{{n}} weeks ago",
        monthsAgo: "{{n}} months ago",
        yearsAgo: "{{n}} years ago",
      },
    },
    display: {
      metadata: "📌 Metadata:",
      file: "File",
      status: "Status",
      priority: "Priority",
      tags: "Tags: {{tags}}",
      created: "Created: {{date}}",
      updated: "Updated: {{date}}",
      due: "Due: {{date}}",
      repository: "Repository: {{repo}}",
      customFields: "🔧 Custom fields:",
      noContent: "(no content)",
    },
    validation: {
      filename: {
        pathSeparator: "Filename cannot contain path separators (/ or \\)",
        relativePath: "Filename cannot contain relative paths (..)",
        empty: "Filename is empty",
        tooLong: "Filename is too long (max 255 characters)",
        invalidCharacters: "Filename contains invalid characters",
      },
    },
  },
};
