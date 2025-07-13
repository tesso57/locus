import { Command } from "@cliffy/command";
import {
  TagsClearOptions,
  TagsGetOptions,
  TagsListOptions,
  TagsRemoveOptions,
  TagsSetOptions,
} from "../types.ts";
import { getErrorMessage } from "../utils/errors-i18n.ts";
import { exitWithError, getRepoInfoOptional } from "./utils/command-helpers.ts";
import { I18nService } from "../services/i18n.ts";
import { ServiceContainer } from "../services/service-container.ts";
import { TagsService } from "../services/tags-service.ts";
import { PropertyNotFoundError, TaskNotFoundError } from "../utils/errors.ts";

export function createTagsCommand(i18n: I18nService): Command<any, any, any> {
  return new Command()
    .name("tags")
    .description(i18n.t("tags.description"))
    .action(() => {
      console.log(i18n.t("tags.messages.specifySubcommand"));
      console.log(i18n.t("tags.messages.availableSubcommands"));
    })
    // list subcommand
    .command("list", i18n.t("tags.list.description"))
    .arguments("[fileName:string]")
    .option("--no-git", i18n.t("tags.options.noGit.description"))
    .action(async (options, fileName?: string) => {
      const container = ServiceContainer.getInstance();
      container.setI18nService(i18n);
      const tagsService = await container.getTagsService();
      const gitService = container.getGitService();
      const repoInfo = await getRepoInfoOptional(gitService, !options.git);
      await listTags(tagsService, { fileName, repoInfo }, i18n);
    })
    // get subcommand
    .command("get", i18n.t("tags.get.description"))
    .arguments("<fileName:string> <property:string>")
    .option("--no-git", i18n.t("tags.options.noGit.description"))
    .action(async (options, fileName: string, property: string) => {
      const container = ServiceContainer.getInstance();
      container.setI18nService(i18n);
      const tagsService = await container.getTagsService();
      const gitService = container.getGitService();
      const repoInfo = await getRepoInfoOptional(gitService, !options.git);
      await getTag(tagsService, { fileName, property, repoInfo }, i18n);
    })
    // set subcommand
    .command("set", i18n.t("tags.set.description"))
    .alias("add")
    .arguments("<fileName:string> <property:string> <value:string>")
    .option("--no-git", i18n.t("tags.options.noGit.description"))
    .action(async (options, fileName: string, property: string, value: string) => {
      const container = ServiceContainer.getInstance();
      container.setI18nService(i18n);
      const tagsService = await container.getTagsService();
      const gitService = container.getGitService();
      const repoInfo = await getRepoInfoOptional(gitService, !options.git);

      // Try to parse value as JSON first, fallback to string
      let parsedValue: unknown = value;
      try {
        parsedValue = JSON.parse(value);
      } catch {
        // Keep as string if not valid JSON
      }

      await setTag(tagsService, { fileName, property, value: parsedValue, repoInfo }, i18n);
    })
    // rm subcommand
    .command("rm", i18n.t("tags.rm.description"))
    .alias("remove")
    .arguments("<fileName:string> <property:string>")
    .option("--no-git", i18n.t("tags.options.noGit.description"))
    .action(async (options, fileName: string, property: string) => {
      const container = ServiceContainer.getInstance();
      container.setI18nService(i18n);
      const tagsService = await container.getTagsService();
      const gitService = container.getGitService();
      const repoInfo = await getRepoInfoOptional(gitService, !options.git);
      await removeTag(tagsService, { fileName, property, repoInfo }, i18n);
    })
    // clear subcommand
    .command("clear", i18n.t("tags.clear.description"))
    .arguments("<fileName:string>")
    .option("--no-git", i18n.t("tags.options.noGit.description"))
    .action(async (options, fileName: string) => {
      const container = ServiceContainer.getInstance();
      container.setI18nService(i18n);
      const tagsService = await container.getTagsService();
      const gitService = container.getGitService();
      const repoInfo = await getRepoInfoOptional(gitService, !options.git);
      await clearTags(tagsService, { fileName, repoInfo }, i18n);
    });
}

async function listTags(
  tagsService: TagsService,
  options: TagsListOptions,
  i18n: I18nService,
): Promise<void> {
  try {
    const result = await tagsService.listTags(options);
    if (!result.ok) {
      if (result.error instanceof TaskNotFoundError) {
        exitWithError(i18n.t("tags.messages.fileNotFound", { filename: options.fileName }));
      } else {
        const message = getErrorMessage(result.error, i18n);
        exitWithError(message);
      }
      return;
    }

    const tagInfos = result.value;

    if (!options.fileName) {
      // List all task files
      console.log(i18n.t("tags.messages.taskFileList"));

      if (tagInfos.length === 0) {
        console.log(i18n.t("tags.messages.noTaskFiles"));
      } else {
        for (const info of tagInfos) {
          console.log(`  ${info.path}`);
        }
        console.log(i18n.t("tags.messages.totalFiles", { count: tagInfos.length }));
      }
    } else {
      // Show properties of specific file
      const tagInfo = tagInfos[0];
      const frontmatter = tagInfo.frontmatter;

      if (!frontmatter || Object.keys(frontmatter).length === 0) {
        console.log(i18n.t("tags.messages.noProperties"));
        return;
      }

      console.log(i18n.t("tags.messages.properties", { filename: tagInfo.path }));
      for (const [key, value] of Object.entries(frontmatter)) {
        if (typeof value === "string" && value.includes("\n")) {
          console.log(`  ${key}: |`);
          value.split("\n").forEach((line) => console.log(`    ${line}`));
        } else if (Array.isArray(value)) {
          console.log(`  ${key}: [${value.join(", ")}]`);
        } else if (typeof value === "object" && value !== null) {
          console.log(`  ${key}: ${JSON.stringify(value)}`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      }
    }
  } catch (error: unknown) {
    const message = getErrorMessage(error, i18n);
    exitWithError(message);
  }
}

async function getTag(
  tagsService: TagsService,
  options: TagsGetOptions,
  i18n: I18nService,
): Promise<void> {
  try {
    const result = await tagsService.getTag(options);
    if (!result.ok) {
      if (result.error instanceof TaskNotFoundError) {
        exitWithError(i18n.t("tags.messages.fileNotFound", { filename: options.fileName }));
      } else if (result.error instanceof PropertyNotFoundError) {
        exitWithError(i18n.t("tags.messages.propertyNotFound", { property: options.property }));
      } else {
        const message = getErrorMessage(result.error, i18n);
        exitWithError(message);
      }
      return;
    }

    const value = result.value;
    if (typeof value === "object") {
      console.log(JSON.stringify(value, null, 2));
    } else {
      console.log(value);
    }
  } catch (error: unknown) {
    const message = getErrorMessage(error, i18n);
    exitWithError(message);
  }
}

async function setTag(
  tagsService: TagsService,
  options: TagsSetOptions,
  i18n: I18nService,
): Promise<void> {
  try {
    const result = await tagsService.setTag(options);
    if (!result.ok) {
      const message = getErrorMessage(result.error, i18n);
      exitWithError(message);
      return;
    }

    console.log(i18n.t("tags.messages.propertyUpdated", { property: options.property }));
  } catch (error: unknown) {
    const message = getErrorMessage(error, i18n);
    exitWithError(message);
  }
}

async function removeTag(
  tagsService: TagsService,
  options: TagsRemoveOptions,
  i18n: I18nService,
): Promise<void> {
  try {
    const result = await tagsService.removeTag(options);
    if (!result.ok) {
      if (result.error instanceof TaskNotFoundError) {
        exitWithError(i18n.t("tags.messages.fileNotFound", { filename: options.fileName }));
      } else if (result.error instanceof PropertyNotFoundError) {
        exitWithError(i18n.t("tags.messages.propertyNotExists", { property: options.property }));
      } else {
        const message = getErrorMessage(result.error, i18n);
        exitWithError(message);
      }
      return;
    }

    console.log(i18n.t("tags.messages.propertyDeleted", { property: options.property }));
  } catch (error: unknown) {
    const message = getErrorMessage(error, i18n);
    exitWithError(message);
  }
}

async function clearTags(
  tagsService: TagsService,
  options: TagsClearOptions,
  i18n: I18nService,
): Promise<void> {
  try {
    const result = await tagsService.clearTags(options);
    if (!result.ok) {
      if (result.error instanceof TaskNotFoundError) {
        exitWithError(i18n.t("tags.messages.fileNotFound", { filename: options.fileName }));
      } else {
        const message = getErrorMessage(result.error, i18n);
        exitWithError(message);
      }
      return;
    }

    console.log(i18n.t("tags.messages.allPropertiesDeleted"));
  } catch (error: unknown) {
    const message = getErrorMessage(error, i18n);
    exitWithError(message);
  }
}
