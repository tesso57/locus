import { Command } from "@cliffy/command";
import { colors } from "@cliffy/ansi";
import { CreateTaskOptions } from "../services/task-service.ts";
import { ServiceContainer } from "../services/service-container.ts";
import { createAction, executeCommand, getRepoInfoOptional } from "./utils/command-helpers.ts";
import { AddOptions } from "./utils/option-types.ts";
import { ok } from "../utils/result.ts";
import { I18nService } from "../services/i18n.ts";
import * as formatI18n from "../utils/format-i18n.ts";

export function createAddCommand(i18n: I18nService): Command<any, any, any> {
  return new Command()
    .name("add")
    .description(i18n.t("add.description"))
    .arguments("<title:string>")
    .option("-b, --body <body:string>", i18n.t("add.options.body.description"))
    .option("-t, --tags <tags:string[]>", i18n.t("add.options.tags.description"))
    .option("-p, --priority <priority:string>", i18n.t("add.options.priority.description"))
    .option("-s, --status <status:string>", i18n.t("add.options.status.description"))
    .option("--no-git", i18n.t("add.options.noGit.description"))
    .option("--json", i18n.t("add.options.json.description"))
    .action(createAction<AddOptions>(async (options, title: string) => {
      await executeCommand(async ({ container }) => {
        // Set the i18n service on the container
        container.setI18nService(i18n);

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

          console.log(colors.green(i18n.t("common.success.taskCreated", { path: taskPath })));

          if (repoInfo) {
            console.log(
              colors.blue(
                i18n.t("add.messages.repository", { repo: `${repoInfo.owner}/${repoInfo.repo}` }),
              ),
            );
          } else if (!options.noGit) {
            console.log(colors.gray(i18n.t("add.messages.location")));
          }

          console.log(`\n${colors.bold(i18n.t("add.messages.taskDetails"))}`);
          console.log(`  ${i18n.t("add.messages.title", { title })}`);
          console.log(`  ${i18n.t("add.messages.filename", { filename: fileName })}`);
          console.log(
            `  ${
              i18n.t("add.messages.status", {
                status: formatI18n.formatStatus(createOptions.status, i18n),
              })
            }`,
          );
          console.log(
            `  ${
              i18n.t("add.messages.priority", {
                priority: formatI18n.formatPriority(createOptions.priority, i18n),
              })
            }`,
          );
          if (createOptions.tags && createOptions.tags.length > 0) {
            console.log(
              `  ${
                i18n.t("add.messages.tags", { tags: formatI18n.formatTags(createOptions.tags) })
              }`,
            );
          }
        }

        return ok(undefined);
      });
    }));
}
