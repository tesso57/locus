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
import { PathResolver } from "../services/path-resolver.ts";
import { TaskService } from "../services/task-service.ts";
import { RepoInfo } from "../types.ts";

/**
 * Read content from stdin
 */
async function readStdinContent(): Promise<string> {
  const decoder = new TextDecoder();
  const chunks: Uint8Array[] = [];

  for await (const chunk of Deno.stdin.readable) {
    chunks.push(chunk);
  }

  // Combine all chunks efficiently
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const buffer = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }

  return decoder.decode(buffer);
}

/**
 * Handle creating a new task
 */
async function handleNewTask(
  fileName: string,
  bodyContent: string,
  taskService: TaskService,
  pathResolver: PathResolver,
  repoInfo: RepoInfo | null,
  options: EditOptions,
  i18n: I18nService,
): Promise<void> {
  if (!bodyContent) {
    exitWithError(i18n.t("edit.error.noBodyForNewTask"));
  }

  // Extract title from body if exists
  const titleMatch = bodyContent.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : fileName.replace(/\.md$/, "");

  const createResult = await taskService.createTask({
    title,
    body: bodyContent,
    repoInfo,
  });

  if (!createResult.ok) {
    throw createResult.error;
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
    const taskPath = taskDirResult.ok ? `${taskDirResult.value}/${newFileName}` : newFileName;
    console.log(colors.green(i18n.t("common.success.taskCreated", { path: taskPath })));
  }
}

/**
 * Handle updating an existing task
 */
async function handleExistingTask(
  existingTask: any,
  bodyContent: string | undefined,
  taskService: TaskService,
  pathResolver: PathResolver,
  repoInfo: RepoInfo | null,
  options: EditOptions,
  i18n: I18nService,
): Promise<void> {
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
    fileName: existingTask.fileName,
    body: newBodyContent,
    repoInfo,
  });

  if (!updateResult.ok) {
    throw updateResult.error;
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
}

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
          bodyContent = await readStdinContent();
          // Generate default filename with current date and "stdin" suffix
          const dateStr = new Date().toISOString().split("T")[0];
          const randomHash = Math.random().toString(36).substring(2, 10);
          actualFileName = `${dateStr}-stdin-${randomHash}`;
        }

        // Validate filename for security
        if (actualFileName !== "-") {
          // Always validate filename to prevent path traversal
          if (!isAbsolute(actualFileName)) {
            validateFileName(actualFileName);
          } else {
            // For absolute paths, ensure they are within the task directory
            const taskDirResult = await pathResolver.getTaskDir(null);
            if (taskDirResult.ok) {
              const taskDir = taskDirResult.value;
              if (!actualFileName.startsWith(taskDir)) {
                exitWithError(
                  i18n.t("common.error.fileOutsideTaskDirectory", { path: actualFileName }),
                );
              }
            }
          }
        }

        // Get repository information
        const repoInfo = await getRepoInfoOptional(gitService, options.noGit);

        // Check if the task already exists
        const existingTaskResult = await taskService.getTask(actualFileName, repoInfo);

        if (!existingTaskResult.ok) {
          // Create new task
          await handleNewTask(
            actualFileName,
            bodyContent || "",
            taskService,
            pathResolver,
            repoInfo,
            options,
            i18n,
          );
        } else {
          // Update existing task
          await handleExistingTask(
            existingTaskResult.value,
            bodyContent,
            taskService,
            pathResolver,
            repoInfo,
            options,
            i18n,
          );
        }

        return ok(undefined);
      });
    }));
}
