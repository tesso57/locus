import { Command } from "@cliffy/command";
import { I18nService } from "../services/i18n.ts";
import { ServiceContainer } from "../services/service-container.ts";
import { TagsService } from "../services/tags-service.ts";
import { exitWithError, getRepoInfoOptional } from "./utils/command-helpers.ts";
import { getErrorMessage } from "../utils/errors-i18n.ts";
import { TaskNotFoundError } from "../utils/errors.ts";
import { parseKeyValuePairs } from "../utils/property-parser.ts";

export function createSetCommand(i18n: I18nService): Command<any, any, any> {
  return new Command()
    .name("set")
    .description(i18n.t("set.description"))
    .arguments("<fileName:string> [...properties:string]")
    .option("--no-git", i18n.t("set.options.noGit.description"))
    .action(async (options, fileName: string, ...properties: string[]) => {
      const container = ServiceContainer.getInstance();
      container.setI18nService(i18n);
      const tagsService = await container.getTagsService();
      const gitService = container.getGitService();
      const repoInfo = await getRepoInfoOptional(gitService, !options.git);

      if (properties.length === 0) {
        exitWithError(i18n.t("set.messages.noProperties"));
        return;
      }

      // Parse key=value pairs
      const updates = parseKeyValuePairs(properties);

      // Validate that all properties are valid key=value format
      for (const prop of properties) {
        if (!prop.includes("=")) {
          exitWithError(i18n.t("set.messages.invalidFormat", { property: prop }));
          return;
        }
        const key = prop.substring(0, prop.indexOf("="));
        if (!key) {
          exitWithError(i18n.t("set.messages.emptyKey", { property: prop }));
          return;
        }
      }

      if (Object.keys(updates).length === 0) {
        exitWithError(i18n.t("set.messages.noValidProperties"));
        return;
      }

      // Apply all updates
      for (const [key, value] of Object.entries(updates)) {
        try {
          const result = await tagsService.setTag({ fileName, property: key, value });
          if (!result.ok) {
            if (result.error instanceof TaskNotFoundError) {
              exitWithError(i18n.t("set.messages.fileNotFound", { filename: fileName }));
            } else {
              const message = getErrorMessage(result.error, i18n);
              exitWithError(message);
            }
            return;
          }
        } catch (error: unknown) {
          const message = getErrorMessage(error, i18n);
          exitWithError(message);
          return;
        }
      }

      const count = Object.keys(updates).length;
      console.log(i18n.t("set.messages.propertiesUpdated", { count }));
    });
}
