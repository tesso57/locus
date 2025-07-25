import { Command } from "@cliffy/command";
import { colors } from "@cliffy/ansi/colors";
import { TaskService } from "../services/task-service.ts";
import { FileSystem } from "../services/file-system.ts";
import { displayTask } from "../utils/display.ts";
import { isAbsolute } from "@std/path";
import {
  createAction,
  executeCommand,
  exitWithError,
  getRepoInfoOptional,
  output,
} from "./utils/command-helpers.ts";
import { ReadOptions } from "./utils/option-types.ts";
import { getFileName, readTextFile, validateFileExists } from "./utils/file-helpers.ts";
import { ok } from "../utils/result.ts";
import { I18nService } from "../services/i18n.ts";
import { MarkdownService } from "../services/markdown-service.ts";

export function createReadCommand(i18n: I18nService): Command<any, any, any> {
  return new Command()
    .name("read")
    .description(i18n.t("read.description"))
    .arguments("<fileName:string>")
    .option("-r, --raw", i18n.t("read.options.raw.description"))
    .option("--no-git", i18n.t("read.options.noGit.description"))
    .option("--json", i18n.t("read.options.json.description"))
    .option("--no-color", i18n.t("read.options.noColor.description"))
    .option("--pager <pager:string>", i18n.t("read.options.pager.description"))
    .action(createAction<ReadOptions>(async (options, fileName: string) => {
      await executeCommand(async ({ container }) => {
        // Set the i18n service on the container
        container.setI18nService(i18n);

        const taskService = await container.getTaskService();
        const gitService = container.getGitService();
        const fileSystem = container.getFileSystem();
        const markdownService = container.getMarkdownService();

        // Check if the provided path is absolute
        if (isAbsolute(fileName)) {
          // Handle absolute path directly
          await readAbsolutePath(fileName, options, fileSystem, markdownService, i18n);
          return ok(undefined);
        }

        // Validate filename for security (only for relative paths)
        const validateResult = markdownService.validateFileName(fileName);
        if (!validateResult.ok) {
          return validateResult;
        }

        // Get repository information
        const repoInfo = await getRepoInfoOptional(gitService, options.noGit);

        // Get task using TaskService
        const taskResult = await taskService.getTask(fileName, repoInfo);
        if (!taskResult.ok) {
          return taskResult;
        }

        const task = taskResult.value;

        // Handle different output formats
        if (options.json) {
          output(task, options, () => "");
          return ok(undefined);
        }

        if (options.raw) {
          // Display raw markdown content
          const content = task.frontmatter
            ? `---\n${
              Object.entries(task.frontmatter)
                .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
                .join("\n")
            }\n---\n${task.body}`
            : task.body;

          await outputWithPager(content, options);
          return ok(undefined);
        }

        // Display formatted task
        let isTerminal = false;
        try {
          isTerminal = Deno.stdout.isTerminal() ?? false;
        } catch {
          // Ignore errors in test environment
        }
        const formattedOutput = displayTask(task, {
          noColor: options.noColor || !isTerminal,
          repoInfo,
        }, i18n);

        await outputWithPager(formattedOutput, options);

        return ok(undefined);
      });
    }));
}

async function readAbsolutePath(
  filePath: string,
  options: ReadOptions,
  fileSystem: FileSystem,
  markdownService: MarkdownService,
  i18n: I18nService,
): Promise<void> {
  // Check if file exists
  const existsResult = await validateFileExists(filePath, fileSystem);
  if (!existsResult.ok) {
    exitWithError(i18n.t("common.error.fileNotFound", { filename: filePath }));
  }

  // Read file content
  const contentResult = await readTextFile(filePath, fileSystem);
  if (!contentResult.ok) {
    exitWithError(contentResult.error.message);
  }

  const content = contentResult.value;

  // Parse markdown
  const parseResult = markdownService.parseMarkdown(content);
  if (!parseResult.ok) {
    exitWithError(parseResult.error.message);
  }
  const { frontmatter, body } = parseResult.value;

  // Extract title from body if exists
  const titleMatch = body.match(/^#\s+(.+)$/m);
  const title = titleMatch
    ? titleMatch[1]
    : getFileName(filePath).replace(/\.md$/, "") || "Untitled";

  // Create task info object
  const task = {
    fileName: getFileName(filePath),
    title,
    status: frontmatter?.status || "unknown",
    priority: frontmatter?.priority || "normal",
    tags: frontmatter?.tags || [],
    created: frontmatter?.created || new Date().toISOString(),
    path: filePath,
    frontmatter: frontmatter || {},
    body,
  };

  // Handle different output formats
  if (options.json) {
    output(task, options, () => "");
    return;
  }

  if (options.raw) {
    // Display raw markdown content
    await outputWithPager(content, options);
    return;
  }

  // Display formatted task
  let isTerminal = false;
  try {
    isTerminal = Deno.stdout.isTerminal() ?? false;
  } catch {
    // Ignore errors in test environment
  }
  const formattedOutput = displayTask(task, {
    noColor: options.noColor || !isTerminal,
    repoInfo: null,
  }, i18n);

  await outputWithPager(formattedOutput, options);
}

async function outputWithPager(content: string, options: ReadOptions): Promise<void> {
  // In test environment, always output directly
  if ((globalThis as any).__TEST__) {
    console.log(content);
    return;
  }

  // If output is not a terminal or pager is "never", just print
  let isTerminal = false;
  try {
    isTerminal = Deno.stdout.isTerminal() ?? false;
  } catch {
    // Ignore errors in test environment
  }

  if (!isTerminal || options.pager === "never") {
    console.log(content);
    return;
  }

  // Count lines to determine if pager is needed
  const lines = content.split("\n").length;
  let terminalHeight = 24;
  try {
    terminalHeight = Deno.consoleSize?.().rows || 24;
  } catch {
    // Use default height in test environment
  }

  // If content fits on screen, just print it
  if (lines < terminalHeight - 2) {
    console.log(content);
    return;
  }

  // Determine which pager to use
  const pager = options.pager || Deno.env.get("PAGER") || "less";

  if (pager === "cat") {
    console.log(content);
    return;
  }

  try {
    // Try to use the specified pager
    const pagerCommand = new Deno.Command(pager, {
      stdin: "piped",
      stdout: "inherit",
      stderr: "inherit",
    });

    const pagerProcess = pagerCommand.spawn();
    const writer = pagerProcess.stdin.getWriter();
    await writer.write(new TextEncoder().encode(content));
    await writer.close();

    const status = await pagerProcess.status;
    if (!status.success && status.code !== 0) {
      // If pager failed, fall back to direct output
      console.log(content);
    }
  } catch {
    // If pager is not available, fall back to direct output
    console.log(content);
  }
}
