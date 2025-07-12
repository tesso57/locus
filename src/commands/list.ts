import { Command } from "@cliffy/command";
import { Table } from "@cliffy/table";
import { colors } from "@cliffy/ansi";
import { TaskInfo, TaskService } from "../services/task-service.ts";
import { GitService } from "../services/git-service.ts";
import { PathResolver } from "../services/path-resolver.ts";
import {
  formatDate,
  formatPriority,
  formatStatus,
  formatTags,
  priorityValue,
} from "../utils/format.ts";
import { join } from "@std/path";
import { createAction, executeCommand } from "./utils/command-helpers.ts";
import { ok } from "../utils/result.ts";
import { getErrorMessage } from "../utils/errors.ts";

interface ListOptions {
  status?: string;
  priority?: string;
  tags?: string[];
  sort?: string;
  detail?: boolean;
  all?: boolean;
  json?: boolean;
  groupByRepo?: boolean;
}

export function createListCommand(): any {
  return new Command()
    .name("list")
    .description("タスクの一覧を表示")
    .option("-s, --status <status:string>", "ステータスでフィルタ")
    .option("-p, --priority <priority:string>", "優先度でフィルタ")
    .option("-t, --tags <tags:string[]>", "タグでフィルタ（カンマ区切り）")
    .option("--sort <field:string>", "ソート項目 (created, status, priority, title)")
    .option("-d, --detail", "詳細情報を表示")
    .option("-a, --all", "全てのリポジトリのタスクを表示")
    .option("-g, --group-by-repo", "リポジトリごとにグループ化して表示")
    .option("--json", "JSON形式で出力")
    .action(createAction<ListOptions>(async (options) => {
      await executeCommand(async ({ container }) => {
        const taskService = await container.getTaskService();
        const gitService = container.getGitService();
        const pathResolver = await container.getPathResolver();

        await listTasks(taskService, gitService, pathResolver, options);
        return ok(undefined);
      });
    }));
}

async function listTasks(
  taskService: TaskService,
  gitService: GitService,
  pathResolver: PathResolver,
  options: ListOptions,
): Promise<void> {
  try {
    // Get base directory for full path reconstruction
    const baseDirResult = pathResolver.getBaseDir();
    const baseDir = baseDirResult.ok ? baseDirResult.value : "";

    // Get repository information
    const repoInfoResult = options.all
      ? { ok: true as const, value: null }
      : await gitService.getRepoInfo();

    if (!repoInfoResult.ok) {
      console.error(`エラー: ${repoInfoResult.error.message}`);
      Deno.exit(1);
    }

    const repoInfo = repoInfoResult.value;

    // Get tasks using TaskService
    const tasksResult = await taskService.listTasks({
      status: options.status,
      priority: options.priority,
      tags: options.tags,
      all: options.all,
      repoInfo,
    });

    if (!tasksResult.ok) {
      console.error(`エラー: ${tasksResult.error.message}`);
      Deno.exit(1);
    }

    const tasks = tasksResult.value;

    // Sort tasks
    if (options.sort) {
      tasks.sort((a, b) => {
        switch (options.sort) {
          case "created":
            return new Date(b.created).getTime() - new Date(a.created).getTime();
          case "status":
            return a.status.localeCompare(b.status);
          case "priority":
            return priorityValue(b.priority) - priorityValue(a.priority);
          case "title":
            return a.title.localeCompare(b.title);
          default:
            return 0;
        }
      });
    } else {
      // Default sort by created date (newest first)
      tasks.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
    }

    // Output results
    if (options.json) {
      console.log(JSON.stringify(tasks, null, 2));
      return;
    }

    if (tasks.length === 0) {
      console.log("タスクが見つかりませんでした。");
      if (repoInfo) {
        console.log(`📁 リポジトリ: ${repoInfo.owner}/${repoInfo.repo}`);
      }
      return;
    }

    // Group by repository if requested
    if (options.groupByRepo) {
      const tasksByRepo = new Map<string, TaskInfo[]>();

      for (const task of tasks) {
        const repo = task.repository || "default";
        if (!tasksByRepo.has(repo)) {
          tasksByRepo.set(repo, []);
        }
        tasksByRepo.get(repo)!.push(task);
      }

      // Sort repositories
      const sortedRepos = Array.from(tasksByRepo.keys()).sort();

      console.log(`📁 全リポジトリのタスク`);
      console.log(`📋 総タスク数: ${tasks.length}\n`);

      for (const repo of sortedRepos) {
        const repoTasks = tasksByRepo.get(repo)!;
        console.log(colors.cyan(`\n━━━ ${repo} ━━━`));
        console.log(`📋 タスク数: ${repoTasks.length}\n`);

        if (options.detail) {
          // Detailed view for each repo
          for (const task of repoTasks) {
            const fullPath = baseDir ? join(baseDir, task.path) : task.path;
            console.log(colors.bold(task.title));
            console.log(`  ファイル: ${colors.gray(task.fileName)}`);
            console.log(`  フルパス: ${colors.gray(fullPath)}`);
            console.log(`  ステータス: ${formatStatus(task.status)}`);
            console.log(`  優先度: ${formatPriority(task.priority)}`);
            if (task.tags.length > 0) {
              console.log(`  タグ: ${formatTags(task.tags)}`);
            }
            console.log(`  作成日: ${formatDate(task.created)}`);
            console.log();
          }
        } else {
          // Table view for each repo
          const table = new Table()
            .header(["タイトル", "ステータス", "優先度", "タグ", "作成日"])
            .body(
              repoTasks.map((task) => [
                task.title,
                formatStatus(task.status),
                formatPriority(task.priority),
                formatTags(task.tags),
                formatDate(task.created),
              ]),
            )
            .maxColWidth(40)
            .padding(1)
            .indent(2);

          table.render();
        }
      }
      return;
    }

    // Display header
    if (repoInfo) {
      console.log(`📁 リポジトリ: ${colors.cyan(repoInfo.owner + "/" + repoInfo.repo)}`);
    } else {
      console.log(`📁 全てのタスク`);
    }
    console.log(`📋 タスク数: ${tasks.length}\n`);

    if (options.detail) {
      // Detailed view
      for (const task of tasks) {
        const fullPath = baseDir ? join(baseDir, task.path) : task.path;
        console.log(colors.bold(task.title));
        console.log(`  ファイル: ${colors.gray(task.fileName)}`);
        console.log(`  フルパス: ${colors.gray(fullPath)}`);
        console.log(`  ステータス: ${formatStatus(task.status)}`);
        console.log(`  優先度: ${formatPriority(task.priority)}`);
        if (task.tags.length > 0) {
          console.log(`  タグ: ${formatTags(task.tags)}`);
        }
        console.log(`  作成日: ${formatDate(task.created)}`);
        console.log();
      }
    } else {
      // Table view
      const table = new Table()
        .header(["タイトル", "ステータス", "優先度", "タグ", "作成日"])
        .body(
          tasks.map((task) => [
            task.title,
            formatStatus(task.status),
            formatPriority(task.priority),
            formatTags(task.tags),
            formatDate(task.created),
          ]),
        )
        .maxColWidth(40)
        .padding(1)
        .indent(2);

      table.render();
    }
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error(`エラー: ${message}`);
    Deno.exit(1);
  }
}
