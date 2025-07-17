import { parse } from "@std/yaml";
import { deepMerge } from "@std/collections";
import { exists } from "@std/fs";
import { join } from "@std/path";
import { Config } from "../types.ts";
import { DEFAULT_CONFIG } from "./defaults.ts";
import { getErrorMessage } from "../utils/errors.ts";
import { getDefaultConfigDir } from "../utils/platform.ts";

let cachedConfig: Config | null = null;

/**
 * Find configuration file following XDG Base Directory specification
 */
export async function findConfigFile(): Promise<string | null> {
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
      return path;
    }
  }

  return null;
}

/**
 * Extract configuration from environment variables
 */
function extractFromEnv(): Partial<Config> {
  const env = Deno.env.toObject();
  const config: Partial<Config> = {};

  if (env.LOCUS_TASK_DIRECTORY) {
    config.task_directory = env.LOCUS_TASK_DIRECTORY;
  }

  if (env.LOCUS_GIT_EXTRACT_USERNAME !== undefined) {
    if (!config.git) {
      config.git = { extract_username: true, username_from_remote: true };
    }
    config.git.extract_username = env.LOCUS_GIT_EXTRACT_USERNAME !== "false";
  }

  if (env.LOCUS_GIT_USERNAME_FROM_REMOTE !== undefined) {
    if (!config.git) {
      config.git = { extract_username: true, username_from_remote: true };
    }
    config.git.username_from_remote = env.LOCUS_GIT_USERNAME_FROM_REMOTE !== "false";
  }

  if (env.LOCUS_FILE_NAMING_PATTERN) {
    if (!config.file_naming) {
      config.file_naming = { pattern: "", date_format: "", hash_length: 0 };
    }
    config.file_naming.pattern = env.LOCUS_FILE_NAMING_PATTERN;
  }

  if (env.LOCUS_FILE_NAMING_DATE_FORMAT) {
    if (!config.file_naming) {
      config.file_naming = { pattern: "", date_format: "", hash_length: 0 };
    }
    config.file_naming.date_format = env.LOCUS_FILE_NAMING_DATE_FORMAT;
  }

  if (env.LOCUS_FILE_NAMING_HASH_LENGTH) {
    if (!config.file_naming) {
      config.file_naming = { pattern: "", date_format: "", hash_length: 0 };
    }
    const length = parseInt(env.LOCUS_FILE_NAMING_HASH_LENGTH, 10);
    if (!isNaN(length)) {
      config.file_naming.hash_length = length;
    }
  }

  if (env.LOCUS_DEFAULTS_STATUS) {
    if (!config.defaults) {
      config.defaults = { status: "", priority: "", tags: [] };
    }
    config.defaults.status = env.LOCUS_DEFAULTS_STATUS;
  }

  if (env.LOCUS_DEFAULTS_PRIORITY) {
    if (!config.defaults) {
      config.defaults = { status: "", priority: "", tags: [] };
    }
    config.defaults.priority = env.LOCUS_DEFAULTS_PRIORITY;
  }

  if (env.LOCUS_DEFAULTS_TAGS) {
    if (!config.defaults) {
      config.defaults = { status: "", priority: "", tags: [] };
    }
    config.defaults.tags = env.LOCUS_DEFAULTS_TAGS.split(",").map((t) => t.trim());
  }

  if (env.LOCUS_LANGUAGE_DEFAULT) {
    if (!config.language) {
      config.language = { default: env.LOCUS_LANGUAGE_DEFAULT as "ja" | "en" };
    } else {
      config.language.default = env.LOCUS_LANGUAGE_DEFAULT as "ja" | "en";
    }
  }

  return config;
}

/**
 * Load and merge configuration from all sources
 */
export async function loadConfig(forceReload = false): Promise<Config> {
  if (!forceReload && cachedConfig) {
    return cachedConfig;
  }

  let fileConfig = {};
  const configFile = await findConfigFile();

  if (configFile) {
    try {
      const content = await Deno.readTextFile(configFile);
      fileConfig = parse(content) as Partial<Config>;
    } catch (error: unknown) {
      console.error(
        `Warning: Failed to load config file ${configFile}: ${getErrorMessage(error)}`,
      );
    }
  }

  const envConfig = extractFromEnv();

  // Deep merge: defaults <- file config <- env config
  // Cast to any to work around deepMerge type limitations
  cachedConfig = deepMerge(
    deepMerge(DEFAULT_CONFIG as any, fileConfig as any),
    envConfig as any,
  ) as Config;

  return cachedConfig;
}

/**
 * Get configuration directory path
 */
export function getConfigDir(): string {
  const configHome = getDefaultConfigDir();
  return join(configHome, "locus");
}

/**
 * Create default configuration file
 */
export async function createDefaultConfig(): Promise<void> {
  const configDir = getConfigDir();
  const configPath = join(configDir, "settings.yml");

  if (await exists(configPath)) {
    return;
  }

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
}

/**
 * Override specific configuration values (useful for testing)
 */
export function overrideConfig(overrides: Partial<Config>): void {
  if (cachedConfig) {
    // Cast to any to work around deepMerge type limitations
    cachedConfig = deepMerge(cachedConfig as any, overrides as any) as Config;
  }
}

/**
 * Reset configuration cache
 */
export function resetConfigCache(): void {
  cachedConfig = null;
}
