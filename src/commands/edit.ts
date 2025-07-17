import { Command } from "@cliffy/command";
import { colors } from "@cliffy/ansi/colors";
import { parseMarkdown, validateFileName } from "../utils/markdown.ts";
import { isAbsolute } from "@std/path";
import {
  createAction,
  executeCommand,
  exitWithError,
  getRepoInfoOptional,
} from "./utils/command-helpers.ts";
import { EditOptions } from "./utils/option-types.ts";
import { ok } from "../utils/result.ts";
import { I18nService } from "../services/i18n.ts";

export function createEditCommand(i18n: I18nService): Command<any, any, any> {
  return new Command()
    .name("edit")
    .description(i18n.t("edit.description"))
    .arguments("<fileName:string>")
    .option("-b, --body <body:string>", i18n.t("edit.options.body.description"))
    .option("--overwrite", i18n.t("edit.options.overwrite.description"))
    .option("--no-git", i18n.t("edit.options.noGit.description"))
    .option("--json", i18n.t("edit.options.json.description"))
    .action(createAction<EditOptions>(async (options, fileName: string) => {
      await executeCommand(async ({ container }) => {
        // Set the i18n service on the container
        container.setI18nService(i18n);

        const taskService = await container.getTaskService();
        const gitService = container.getGitService();
        const pathResolver = await container.getPathResolver();

        // Handle stdin input for body
        let bodyContent = options.body;
        let actualFileName = fileName;

        if (fileName === "-") {
          // Read from stdin
          const decoder = new TextDecoder();
          const chunks: Uint8Array[] = [];

          for await (const chunk of Deno.stdin.readable) {
            chunks.push(chunk);
          }

          // Combine all chunks
          let totalLength = 0;
          for (const chunk of chunks) {
            totalLength += chunk.length;
          }

          const buffer = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of chunks) {
            buffer.set(chunk, offset);
            offset += chunk.length;
          }

          bodyContent = decoder.decode(buffer);

          // Generate default filename with current date and "stdin" suffix
          const dateStr = new Date().toISOString().split("T")[0];
          const randomHash = Math.random().toString(36).substring(2, 10);
          actualFileName = `${dateStr}-stdin-${randomHash}`;
        }

        // Validate filename for security (only for relative paths)
        if (!isAbsolute(actualFileName) && actualFileName !== "-") {
          validateFileName(actualFileName);
        }

        // Get repository information
        const repoInfo = await getRepoInfoOptional(gitService, options.noGit);

        // Check if the task already exists
        const existingTaskResult = await taskService.getTask(actualFileName, repoInfo);
        const taskExists = existingTaskResult.ok;

        if (!taskExists) {
          // Create new task
          if (!bodyContent) {
            exitWithError(i18n.t("edit.error.noBodyForNewTask"));
          }

          // Extract title from body if exists
          const titleMatch = bodyContent.match(/^#\s+(.+)$/m);
          const title = titleMatch ? titleMatch[1] : actualFileName.replace(/\.md$/, "");

          const createResult = await taskService.createTask({
            title,
            body: bodyContent,
            repoInfo,
          });

          if (!createResult.ok) {
            return createResult;
          }

          const newFileName = createResult.value;

          if (options.json) {
            console.log(JSON.stringify(
              {
                success: true,
                action: "created",
                fileName: newFileName,
                title,
                repository: repoInfo ? `${repoInfo.owner}/${repoInfo.repo}` : null,
              },
              null,
              2,
            ));
          } else {
            const taskDirResult = await pathResolver.getTaskDir(repoInfo);
            const taskPath = taskDirResult.ok
              ? `${taskDirResult.value}/${newFileName}`
              : newFileName;
            console.log(colors.green(i18n.t("common.success.taskCreated", { path: taskPath })));
          }

          return ok(undefined);
        }

        // Update existing task
        const existingTask = existingTaskResult.value;

        // Determine new body content
        let newBodyContent: string;
        if (options.overwrite) {
          // Overwrite mode
          if (!bodyContent) {
            exitWithError(i18n.t("edit.error.noBodyForOverwrite"));
          }
          newBodyContent = bodyContent;
        } else {
          // Append mode (default)
          if (!bodyContent) {
            exitWithError(i18n.t("edit.error.noBodyForAppend"));
          }
          // Add two newlines between existing content and new content for better readability
          newBodyContent = existingTask.body.trimEnd() + "\n\n" + bodyContent;
        }

        // Update the task
        const updateResult = await taskService.updateTask({
          fileName: actualFileName,
          body: newBodyContent,
          repoInfo,
        });

        if (!updateResult.ok) {
          return updateResult;
        }

        if (options.json) {
          console.log(JSON.stringify(
            {
              success: true,
              action: options.overwrite ? "overwritten" : "appended",
              fileName: existingTask.fileName,
              title: existingTask.title,
              repository: repoInfo ? `${repoInfo.owner}/${repoInfo.repo}` : null,
            },
            null,
            2,
          ));
        } else {
          const taskDirResult = await pathResolver.getTaskDir(repoInfo);
          const taskPath = taskDirResult.ok
            ? `${taskDirResult.value}/${existingTask.fileName}`
            : existingTask.fileName;

          console.log(
            colors.green(
              i18n.t(
                options.overwrite ? "edit.messages.taskOverwritten" : "edit.messages.taskAppended",
                { path: taskPath },
              ),
            ),
          );
        }

        return ok(undefined);
      });
    }));
}
