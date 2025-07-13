import { Result } from "../../utils/result.ts";
import { ServiceContainer } from "../../services/service-container.ts";
import { GitService } from "../../services/git-service.ts";
import { RepoInfo } from "../../types.ts";
import {
  getErrorMessage as getOriginalErrorMessage,
  logError as logOriginalError,
} from "../../utils/errors.ts";
import { I18nService } from "../../services/i18n.ts";
import {
  getErrorMessage as getI18nErrorMessage,
  logError as logI18nError,
} from "../../utils/errors-i18n.ts";

/**
 * Command execution context
 */
export interface CommandContext {
  container: ServiceContainer;
}

/**
 * Standard options interface for commands
 */
export interface BaseCommandOptions {
  json?: boolean;
  noColor?: boolean;
}

/**
 * Exit the process with an error message
 */
export function exitWithError(message: string, code: number = 1): never {
  logOriginalError(message);

  // In test environment, throw an error instead of exiting
  if (Deno.env.get("DENO_TEST") === "true" || (globalThis as any).__TEST__) {
    throw new Error(message);
  }

  Deno.exit(code);
}

/**
 * Get error message with i18n support
 */
export function getErrorMessage(error: unknown, i18n?: I18nService): string {
  if (i18n) {
    return getI18nErrorMessage(error, i18n);
  }
  return getOriginalErrorMessage(error);
}

/**
 * Log error with i18n support
 */
export function logError(message: string, i18n?: I18nService): void {
  if (i18n) {
    logI18nError(message, i18n);
  } else {
    logOriginalError(message);
  }
}

/**
 * Execute a command with proper initialization and error handling
 */
export async function executeCommand<T>(
  action: (ctx: CommandContext) => Promise<Result<T, Error>>,
  i18n?: I18nService,
): Promise<void> {
  const container = ServiceContainer.getInstance();

  try {
    await container.initialize();
    const result = await action({ container });

    if (!result.ok) {
      const message = getErrorMessage(result.error, i18n);
      logError(message, i18n);
      exitWithError(message);
    }
  } catch (error: unknown) {
    const message = getErrorMessage(error, i18n);
    logError(message, i18n);
    exitWithError(message);
  }
}

/**
 * Get repository information with optional Git support
 */
export async function getRepoInfoOptional(
  gitService: GitService,
  noGit?: boolean,
): Promise<RepoInfo | null> {
  if (noGit) {
    return null;
  }

  const repoResult = await gitService.getRepoInfo();
  return repoResult.ok ? repoResult.value : null;
}

/**
 * Format output based on options
 */
export function formatOutput<T>(
  data: T,
  options: BaseCommandOptions,
  formatter: (data: T) => string,
): string {
  if (options.json) {
    return JSON.stringify(data, null, 2);
  }

  if (options.noColor) {
    // This would need to be implemented with a color stripping function
    return formatter(data);
  }

  return formatter(data);
}

/**
 * Output data to console based on options
 */
export function output<T>(
  data: T,
  options: BaseCommandOptions,
  formatter: (data: T) => string,
): void {
  console.log(formatOutput(data, options, formatter));
}

/**
 * Create a typed command action handler
 */
export function createAction<TOptions extends BaseCommandOptions>(
  handler: (options: TOptions, ...args: string[]) => Promise<void>,
): (options: TOptions, ...args: string[]) => Promise<void> {
  return handler;
}
