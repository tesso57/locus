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
} from "../utils/format-i18n.ts";
import { join } from "@std/path";
import {
  BaseCommandOptions,
  createAction,
  executeCommand,
  output,
} from "./utils/command-helpers.ts";
import { ok } from "../utils/result.ts";
import { getErrorMessage, logError } from "../utils/errors.ts";
import { I18nService } from "../services/i18n.ts";

interface ListOptions extends BaseCommandOptions {
  status?: string;
  priority?: string;
  tags?: string[];
  sort?: string;
  detail?: boolean;
  all?: boolean;
  groupByRepo?: boolean;
}

export function createListCommand(i18n: I18nService): Command<any, any, any> {
  return new Command()
    .name("list")
    .description(i18n.t("list.description"))
    .option("-s, --status <status:string>", i18n.t("list.options.status.description"))
    .option("-p, --priority <priority:string>", i18n.t("list.options.priority.description"))
    .option("-t, --tags <tags:string[]>", i18n.t("list.options.tags.description"))
    .option("--sort <field:string>", i18n.t("list.options.sort.description"))
    .option("-d, --detail", i18n.t("list.options.detailed.description"))
    .option("-a, --all", i18n.t("list.options.all.description"))
    .option("-g, --group-by-repo", i18n.t("list.options.group.description"))
    .option("--json", i18n.t("list.options.json.description"))
    .action(createAction<ListOptions>(async (options) => {
      await executeCommand(async ({ container }) => {
        // Set the i18n service on the container
        container.setI18nService(i18n);

        const taskService = await container.getTaskService();
        const gitService = container.getGitService();
        const pathResolver = await container.getPathResolver();

        await listTasks(taskService, gitService, pathResolver, options, i18n);
        return ok(undefined);
      });
    }));
}

async function listTasks(
  taskService: TaskService,
  gitService: GitService,
  pathResolver: PathResolver,
  options: ListOptions,
  i18n: I18nService,
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
      logError(repoInfoResult.error.message);
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
      logError(tasksResult.error.message);
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
    if (tasks.length === 0) {
      output(tasks, options, () => {
        let result = i18n.t("common.info.noTasks");
        if (repoInfo) {
          result += `\n${
            i18n.t("list.messages.repository", { repo: `${repoInfo.owner}/${repoInfo.repo}` })
          }`;
        }
        return result;
      });
      return;
    }

    if (options.json) {
      output(tasks, options, () => "");
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

      console.log(i18n.t("list.messages.allRepositories"));
      console.log(i18n.t("list.messages.totalTasks", { count: tasks.length }) + "\n");

      for (const repo of sortedRepos) {
        const repoTasks = tasksByRepo.get(repo)!;
        console.log(colors.cyan(`\n━━━ ${repo} ━━━`));
        console.log(i18n.t("list.messages.taskCount", { count: repoTasks.length }) + "\n");

        if (options.detail) {
          // Detailed view for each repo
          for (const task of repoTasks) {
            const fullPath = baseDir ? join(baseDir, task.path) : task.path;
            console.log(colors.bold(task.title));
            console.log(
              `  ${i18n.t("list.messages.file", { filename: colors.gray(task.fileName) })}`,
            );
            console.log(`  ${i18n.t("list.messages.fullPath", { path: colors.gray(fullPath) })}`);
            console.log(
              `  ${i18n.t("list.messages.status", { status: formatStatus(task.status, i18n) })}`,
            );
            console.log(
              `  ${
                i18n.t("list.messages.priority", { priority: formatPriority(task.priority, i18n) })
              }`,
            );
            if (task.tags.length > 0) {
              console.log(`  ${i18n.t("list.messages.tags", { tags: formatTags(task.tags) })}`);
            }
            console.log(
              `  ${i18n.t("list.messages.created", { date: formatDate(task.created, i18n) })}`,
            );
            console.log();
          }
        } else {
          // Table view for each repo
          const table = new Table()
            .header([
              i18n.t("list.table.headers.title"),
              i18n.t("list.table.headers.status"),
              i18n.t("list.table.headers.priority"),
              i18n.t("list.table.headers.tags"),
              i18n.t("list.table.headers.created"),
            ])
            .body(
              repoTasks.map((task) => [
                task.title,
                formatStatus(task.status, i18n),
                formatPriority(task.priority, i18n),
                formatTags(task.tags),
                formatDate(task.created, i18n),
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
      console.log(
        i18n.t("list.messages.repository", {
          repo: colors.cyan(repoInfo.owner + "/" + repoInfo.repo),
        }),
      );
    } else {
      console.log(i18n.t("list.messages.allTasks"));
    }
    console.log(i18n.t("list.messages.taskCount", { count: tasks.length }) + "\n");

    if (options.detail) {
      // Detailed view
      for (const task of tasks) {
        const fullPath = baseDir ? join(baseDir, task.path) : task.path;
        console.log(colors.bold(task.title));
        console.log(`  ${i18n.t("list.messages.file", { filename: colors.gray(task.fileName) })}`);
        console.log(`  ${i18n.t("list.messages.fullPath", { path: colors.gray(fullPath) })}`);
        console.log(
          `  ${i18n.t("list.messages.status", { status: formatStatus(task.status, i18n) })}`,
        );
        console.log(
          `  ${
            i18n.t("list.messages.priority", { priority: formatPriority(task.priority, i18n) })
          }`,
        );
        if (task.tags.length > 0) {
          console.log(`  ${i18n.t("list.messages.tags", { tags: formatTags(task.tags) })}`);
        }
        console.log(
          `  ${i18n.t("list.messages.created", { date: formatDate(task.created, i18n) })}`,
        );
        console.log();
      }
    } else {
      // Table view
      const table = new Table()
        .header([
          i18n.t("list.table.headers.title"),
          i18n.t("list.table.headers.status"),
          i18n.t("list.table.headers.priority"),
          i18n.t("list.table.headers.tags"),
          i18n.t("list.table.headers.created"),
        ])
        .body(
          tasks.map((task) => [
            task.title,
            formatStatus(task.status, i18n),
            formatPriority(task.priority, i18n),
            formatTags(task.tags),
            formatDate(task.created, i18n),
          ]),
        )
        .maxColWidth(40)
        .padding(1)
        .indent(2);

      table.render();
    }
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    logError(message);
    Deno.exit(1);
  }
}
