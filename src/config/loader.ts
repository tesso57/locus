import { parse } from "https://deno.land/std@0.224.0/yaml/mod.ts";
import { exists } from "https://deno.land/std@0.224.0/fs/mod.ts";
import { join } from "https://deno.land/std@0.224.0/path/mod.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { Config, ConfigSchema } from "./schema.ts";
import { err, ok, Result } from "../utils/result.ts";
import { ConfigError, ConfigValidationError } from "../utils/errors.ts";

let cachedConfig: Config | null = null;

/**
 * Find configuration file following XDG Base Directory specification
 */
export async function findConfigFile(): Promise<Result<string | null, Error>> {
  try {
    const home = Deno.env.get("XDG_CONFIG_HOME") ??
      join(Deno.env.get("HOME") || "", ".config");

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
    const message = error instanceof Error ? error.message : String(error);
    return err(new ConfigError(`Failed to find config file: ${message}`));
  }
}

/**
 * Extract configuration from environment variables
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
 * Load and validate configuration
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
        const message = error instanceof Error ? error.message : String(error);
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
    const message = error instanceof Error ? error.message : String(error);
    return err(new ConfigError(`Failed to load configuration: ${message}`));
  }
}

/**
 * Get configuration directory path
 */
export function getConfigDir(): Result<string, Error> {
  try {
    const configHome = Deno.env.get("XDG_CONFIG_HOME") ??
      join(Deno.env.get("HOME") || "", ".config");
    return ok(join(configHome, "locus"));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return err(new ConfigError(`Failed to get config directory: ${message}`));
  }
}

/**
 * Create default configuration file
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
  pattern: "{date}-{slug}-{hash}.md"
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
    const message = error instanceof Error ? error.message : String(error);
    return err(new ConfigError(`Failed to create default config: ${message}`));
  }
}

/**
 * Reset configuration cache
 */
export function resetConfigCache(): void {
  cachedConfig = null;
}
