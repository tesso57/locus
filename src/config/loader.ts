/**
 * @module config/loader
 *
 * Configuration loading and management for Locus.
 *
 * This module handles loading configuration from multiple sources with the following precedence:
 * 1. Environment variables (highest priority)
 * 2. Configuration files (YAML format)
 * 3. Default values from schema (lowest priority)
 *
 * Configuration files are searched following the XDG Base Directory specification.
 */

import { parse } from "@std/yaml";
import { exists } from "@std/fs";
import { join } from "@std/path";
import { z } from "zod";
import { Config, ConfigSchema } from "./schema.ts";
import { err, ok, Result } from "../utils/result.ts";
import { ConfigError, ConfigValidationError, getErrorMessage } from "../utils/errors.ts";
import { getDefaultConfigDir } from "../utils/platform.ts";

let cachedConfig: Config | null = null;

/**
 * Finds the configuration file following XDG Base Directory specification.
 *
 * Searches for configuration files in the following order:
 * 1. `$XDG_CONFIG_HOME/locus/settings.yml` (or `~/.config/locus/settings.yml`)
 * 2. `$XDG_CONFIG_HOME/locus/settings.yaml`
 * 3. Each directory in `$XDG_CONFIG_DIRS` (or `/etc/xdg`)
 *
 * @returns Promise resolving to Result with the path to the first found config file, or null if none found
 *
 * @example
 * ```typescript
 * const result = await findConfigFile();
 * if (result.ok && result.value) {
 *   console.log(`Config file found at: ${result.value}`);
 * } else if (result.ok) {
 *   console.log("No config file found, using defaults");
 * }
 * ```
 *
 * @since 0.1.0
 */
export async function findConfigFile(): Promise<Result<string | null, Error>> {
  try {
    const home = getDefaultConfigDir();

    const candidates = [
      join(home, "locus", "settings.yml"),
      join(home, "locus", "settings.yaml"),
      ...((Deno.env.get("XDG_CONFIG_DIRS") ?? "/etc/xdg")
        .split(":")
        .flatMap((d) => [
          join(d, "locus", "settings.yml"),
          join(d, "locus", "settings.yaml"),
        ])),
    ];

    for (const path of candidates) {
      if (await exists(path)) {
        return ok(path);
      }
    }

    return ok(null);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return err(new ConfigError(`Failed to find config file: ${message}`));
  }
}

/**
 * Extracts configuration values from environment variables.
 *
 * Environment variables take precedence over file configuration.
 * Supported environment variables:
 * - `LOCUS_TASK_DIRECTORY`: Override task directory
 * - `LOCUS_GIT_EXTRACT_USERNAME`: Enable/disable username extraction (true/false)
 * - `LOCUS_GIT_USERNAME_FROM_REMOTE`: Enable/disable username from remote (true/false)
 * - `LOCUS_FILE_NAMING_PATTERN`: File naming pattern
 * - `LOCUS_FILE_NAMING_DATE_FORMAT`: Date format for filenames
 * - `LOCUS_FILE_NAMING_HASH_LENGTH`: Hash length for unique identifiers
 * - `LOCUS_DEFAULTS_STATUS`: Default task status
 * - `LOCUS_DEFAULTS_PRIORITY`: Default task priority
 * - `LOCUS_LANGUAGE_DEFAULT`: Default language (ja/en)
 *
 * @returns Partial configuration object with values from environment
 *
 * @since 0.1.0
 */
function extractFromEnv(): Partial<Config> {
  const env = Deno.env.toObject();
  const config: Record<string, unknown> = {};

  if (env.LOCUS_TASK_DIRECTORY) {
    config.task_directory = env.LOCUS_TASK_DIRECTORY;
  }

  // Git config
  const git: Record<string, unknown> = {};
  if (env.LOCUS_GIT_EXTRACT_USERNAME !== undefined) {
    git.extract_username = env.LOCUS_GIT_EXTRACT_USERNAME !== "false";
  }
  if (env.LOCUS_GIT_USERNAME_FROM_REMOTE !== undefined) {
    git.username_from_remote = env.LOCUS_GIT_USERNAME_FROM_REMOTE !== "false";
  }
  if (Object.keys(git).length > 0) {
    config.git = git;
  }

  // File naming config
  const file_naming: Record<string, unknown> = {};
  if (env.LOCUS_FILE_NAMING_PATTERN) {
    file_naming.pattern = env.LOCUS_FILE_NAMING_PATTERN;
  }
  if (env.LOCUS_FILE_NAMING_DATE_FORMAT) {
    file_naming.date_format = env.LOCUS_FILE_NAMING_DATE_FORMAT;
  }
  if (env.LOCUS_FILE_NAMING_HASH_LENGTH) {
    const length = parseInt(env.LOCUS_FILE_NAMING_HASH_LENGTH, 10);
    if (!isNaN(length)) {
      file_naming.hash_length = length;
    }
  }
  if (Object.keys(file_naming).length > 0) {
    config.file_naming = file_naming;
  }

  // Defaults config
  const defaults: Record<string, unknown> = {};
  if (env.LOCUS_DEFAULT_STATUS) {
    defaults.status = env.LOCUS_DEFAULT_STATUS;
  }
  if (env.LOCUS_DEFAULT_PRIORITY) {
    defaults.priority = env.LOCUS_DEFAULT_PRIORITY;
  }
  if (env.LOCUS_DEFAULT_TAGS) {
    defaults.tags = env.LOCUS_DEFAULT_TAGS.split(",").map((t) => t.trim());
  }
  if (Object.keys(defaults).length > 0) {
    config.defaults = defaults;
  }

  return config;
}

/**
 * Deep merge objects (type-safe version)
 */
function deepMerge<T extends Record<string, unknown>>(
  target: T,
  ...sources: Partial<T>[]
): T {
  for (const source of sources) {
    for (const key in source) {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (
        sourceValue &&
        targetValue &&
        typeof sourceValue === "object" &&
        typeof targetValue === "object" &&
        !Array.isArray(sourceValue) &&
        !Array.isArray(targetValue)
      ) {
        target[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>,
        ) as T[Extract<keyof T, string>];
      } else if (sourceValue !== undefined) {
        target[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }
  return target;
}

/**
 * Loads configuration from all sources with proper precedence and caching.
 *
 * Configuration is loaded from three sources in order of precedence:
 * 1. Environment variables (highest priority)
 * 2. Configuration file (YAML format)
 * 3. Default values from schema (lowest priority)
 *
 * The configuration is cached after first load for performance.
 * Use `forceReload` to bypass the cache.
 *
 * @param forceReload - If true, bypasses the cache and reloads configuration
 * @returns Promise resolving to Result with the complete validated configuration
 *
 * @example
 * ```typescript
 * // Load configuration (cached after first call)
 * const configResult = await loadConfig();
 * if (configResult.ok) {
 *   const config = configResult.value;
 *   console.log(`Task directory: ${config.task_directory}`);
 *   console.log(`Default status: ${config.defaults.status}`);
 * }
 *
 * // Force reload to pick up changes
 * const freshConfig = await loadConfig(true);
 * ```
 *
 * @since 0.1.0
 */
export async function loadConfig(forceReload = false): Promise<Result<Config, Error>> {
  if (!forceReload && cachedConfig) {
    return ok(cachedConfig);
  }

  try {
    // Start with default config
    const defaultConfig = ConfigSchema.parse({});

    // Load file config
    let fileConfig = {};
    const configFileResult = await findConfigFile();
    if (!configFileResult.ok) {
      return err(configFileResult.error);
    }

    if (configFileResult.value) {
      try {
        const content = await Deno.readTextFile(configFileResult.value);
        const parsed = parse(content);
        fileConfig = parsed || {};
      } catch (error: unknown) {
        const message = getErrorMessage(error);
        return err(new ConfigError(`Failed to load config file: ${message}`));
      }
    }

    // Get environment config
    const envConfig = extractFromEnv();

    // Merge configs
    const merged = deepMerge(
      {} as Config,
      defaultConfig,
      fileConfig as Partial<Config>,
      envConfig as Partial<Config>,
    );

    // Validate final config
    const parseResult = ConfigSchema.safeParse(merged);
    if (!parseResult.success) {
      return err(
        new ConfigValidationError(
          "Invalid configuration",
          parseResult.error.errors,
        ),
      );
    }

    cachedConfig = parseResult.data;
    return ok(cachedConfig);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return err(new ConfigError(`Failed to load configuration: ${message}`));
  }
}

/**
 * Get configuration directory path
 */
export function getConfigDir(): Result<string, Error> {
  try {
    const configHome = getDefaultConfigDir();
    return ok(join(configHome, "locus"));
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return err(new ConfigError(`Failed to get config directory: ${message}`));
  }
}

/**
 * Creates the default configuration file `settings.yml` in the user's configuration directory if it does not already exist.
 *
 * Generates a YAML template with default settings for task management, git integration, file naming, and task defaults. Creates the configuration directory if necessary.
 *
 * @returns A `Result` indicating success or containing an error if the file could not be created.
 */
export async function createDefaultConfig(): Promise<Result<void, Error>> {
  const configDirResult = getConfigDir();
  if (!configDirResult.ok) {
    return err(configDirResult.error);
  }

  const configDir = configDirResult.value;
  const configPath = join(configDir, "settings.yml");

  if (await exists(configPath)) {
    return ok(undefined);
  }

  try {
    await Deno.mkdir(configDir, { recursive: true });

    const yamlContent = `# Locus configuration file
# See documentation for all available options

# Directory where task files are stored
task_directory: ~/locus

# Git integration settings
git:
  # Extract username from git remote URL
  extract_username: true
  # Use username from remote URL in task directory structure
  username_from_remote: true

# File naming configuration
file_naming:
  # Pattern for task file names
  # Available tokens: {date}, {slug}, {hash}
  pattern: "{slug}.md"
  # Date format (using standard date format tokens)
  date_format: "YYYY-MM-DD"
  # Length of the random hash
  hash_length: 8

# Default values for new tasks
defaults:
  status: "todo"
  priority: "normal"
  tags: []
`;

    await Deno.writeTextFile(configPath, yamlContent);
    return ok(undefined);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return err(new ConfigError(`Failed to create default config: ${message}`));
  }
}

/**
 * Reset configuration cache
 */
export function resetConfigCache(): void {
  cachedConfig = null;
}
