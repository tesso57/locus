import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.4/command/mod.ts";
import { colors } from "https://deno.land/x/cliffy@v1.0.0-rc.4/ansi/colors.ts";
import { CreateTaskOptions } from "../services/task-service.ts";
import { ServiceContainer } from "../services/service-container.ts";
import { createAction, executeCommand, getRepoInfoOptional } from "./utils/command-helpers.ts";
import { AddOptions } from "./utils/option-types.ts";
import { ok } from "../utils/result.ts";

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
    .option("--json", "JSON形式で出力")
    .action(createAction<AddOptions>(async (options, title: string) => {
      await executeCommand(async ({ container }) => {
        const taskService = await container.getTaskService();
        const gitService = container.getGitService();
        const config = await container.getConfig();

        // Get repository information
        const repoInfo = await getRepoInfoOptional(gitService, options.noGit);

        // Create task options
        const createOptions: CreateTaskOptions = {
          title,
          body: options.body,
          tags: options.tags || config.defaults?.tags || [],
          priority: options.priority || config.defaults?.priority || "normal",
          status: options.status || config.defaults?.status || "todo",
          repoInfo,
        };

        // Create task
        const result = await taskService.createTask(createOptions);
        if (!result.ok) {
          return result;
        }

        const fileName = result.value;

        // Display result
        if (options.json) {
          console.log(JSON.stringify(
            {
              success: true,
              fileName,
              title,
              status: createOptions.status,
              priority: createOptions.priority,
              tags: createOptions.tags,
              repository: repoInfo ? `${repoInfo.owner}/${repoInfo.repo}` : null,
            },
            null,
            2,
          ));
        } else {
          const pathResolver = await container.getPathResolver();
          const taskDirResult = await pathResolver.getTaskDir(repoInfo);
          const taskPath = taskDirResult.ok ? `${taskDirResult.value}/${fileName}` : fileName;

          console.log(colors.green(`✨ タスクを作成しました: ${taskPath}`));

          if (repoInfo) {
            console.log(colors.blue(`📁 リポジトリ: ${repoInfo.owner}/${repoInfo.repo}`));
          } else if (!options.noGit) {
            console.log(colors.gray(`📁 場所: デフォルトのタスクディレクトリ`));
          }

          console.log(`\n${colors.bold("📋 タスク詳細:")}`);
          console.log(`  タイトル: ${title}`);
          console.log(`  ファイル名: ${fileName}`);
          console.log(`  ステータス: ${createOptions.status}`);
          console.log(`  優先度: ${createOptions.priority}`);
          if (createOptions.tags && createOptions.tags.length > 0) {
            console.log(`  タグ: ${createOptions.tags.join(", ")}`);
          }
        }

        return ok(undefined);
      });
    }));
}
