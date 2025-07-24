import { Command } from "@cliffy/command";
import { I18nService } from "../services/i18n.ts";
import { ServiceContainer } from "../services/service-container.ts";
import { TagsService } from "../services/tags-service.ts";
import { exitWithError, getRepoInfoOptional } from "./utils/command-helpers.ts";
import { getErrorMessage } from "../utils/errors-i18n.ts";
import { TaskNotFoundError, PropertyNotFoundError } from "../utils/errors.ts";

export function createGetCommand(i18n: I18nService): Command<any, any, any> {
  return new Command()
    .name("get")
    .description(i18n.t("get.description"))
    .arguments("<fileName:string> [property:string]")
    .option("--no-git", i18n.t("get.options.noGit.description"))
    .option("--json", i18n.t("get.options.json.description"))
    .action(async (options, fileName: string, property?: string) => {
      const container = ServiceContainer.getInstance();
      container.setI18nService(i18n);
      const tagsService = await container.getTagsService();
      const gitService = container.getGitService();
      const repoInfo = await getRepoInfoOptional(gitService, !options.git);

      if (property) {
        // Get specific property
        await getProperty(tagsService, fileName, property, options.json || false, i18n);
      } else {
        // Get all properties
        await getAllProperties(tagsService, fileName, options.json || false, i18n);
      }
    });
}

async function getProperty(
  tagsService: TagsService,
  fileName: string,
  property: string,
  asJson: boolean,
  i18n: I18nService,
): Promise<void> {
  try {
    const result = await tagsService.getTag({ fileName, property });
    if (!result.ok) {
      if (result.error instanceof TaskNotFoundError) {
        exitWithError(i18n.t("get.messages.fileNotFound", { filename: fileName }));
      } else if (result.error instanceof PropertyNotFoundError) {
        exitWithError(i18n.t("get.messages.propertyNotFound", { property }));
      } else {
        const message = getErrorMessage(result.error, i18n);
        exitWithError(message);
      }
      return;
    }

    const value = result.value;
    if (asJson || typeof value === "object") {
      console.log(JSON.stringify(value, null, 2));
    } else {
      console.log(value);
    }
  } catch (error: unknown) {
    const message = getErrorMessage(error, i18n);
    exitWithError(message);
  }
}

async function getAllProperties(
  tagsService: TagsService,
  fileName: string,
  asJson: boolean,
  i18n: I18nService,
): Promise<void> {
  try {
    const result = await tagsService.listTags({ fileName });
    if (!result.ok) {
      if (result.error instanceof TaskNotFoundError) {
        exitWithError(i18n.t("get.messages.fileNotFound", { filename: fileName }));
      } else {
        const message = getErrorMessage(result.error, i18n);
        exitWithError(message);
      }
      return;
    }

    const tagInfos = result.value;
    if (tagInfos.length === 0) {
      exitWithError(i18n.t("get.messages.fileNotFound", { filename: fileName }));
      return;
    }

    const tagInfo = tagInfos[0];
    const frontmatter = tagInfo.frontmatter;

    if (!frontmatter || Object.keys(frontmatter).length === 0) {
      if (asJson) {
        console.log("{}");
      } else {
        console.log(i18n.t("get.messages.noProperties"));
      }
      return;
    }

    if (asJson) {
      console.log(JSON.stringify(frontmatter, null, 2));
    } else {
      // Format output similar to tags list command
      for (const [key, value] of Object.entries(frontmatter)) {
        if (typeof value === "string" && value.includes("\n")) {
          console.log(`${key}: |`);
          value.split("\n").forEach((line) => console.log(`  ${line}`));
        } else if (Array.isArray(value)) {
          console.log(`${key}: [${value.join(", ")}]`);
        } else if (typeof value === "object" && value !== null) {
          console.log(`${key}: ${JSON.stringify(value)}`);
        } else {
          console.log(`${key}: ${value}`);
        }
      }
    }
  } catch (error: unknown) {
    const message = getErrorMessage(error, i18n);
    exitWithError(message);
  }
}