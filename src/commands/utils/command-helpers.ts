import { Result } from "../../utils/result.ts";
import { ServiceContainer } from "../../services/service-container.ts";
import { GitService } from "../../services/git-service.ts";
import { RepoInfo } from "../../types.ts";

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
  console.error(`エラー: ${message}`);
  Deno.exit(code);
}

/**
 * Execute a command with proper initialization and error handling
 */
export async function executeCommand<T>(
  action: (ctx: CommandContext) => Promise<Result<T, Error>>,
): Promise<void> {
  const container = ServiceContainer.getInstance();

  try {
    await container.initialize();
    const result = await action({ container });

    if (!result.ok) {
      exitWithError(result.error.message);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
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
