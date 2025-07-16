import { parse } from "@std/yaml";
import { join } from "@std/path";
import { z } from "zod";
import { Config, ConfigSchema } from "../config/schema.ts";
import { ConfigLoader } from "./config-loader.ts";
import { Result, ok, err } from "../utils/result.ts";
import { ConfigError, ConfigValidationError, getErrorMessage } from "../utils/errors.ts";
import { FileSystem } from "./file-system.ts";

/**
 * Default implementation of ConfigLoader service
 */
export class DefaultConfigLoader implements ConfigLoader {
  private cachedConfig: Config | null = null;

  constructor(
    private readonly fileSystem: FileSystem,
  ) {}

  async loadConfig(forceReload = false): Promise<Result<Config, ConfigValidationError>> {
    if (!forceReload && this.cachedConfig) {
      return ok(this.cachedConfig);
    }

    try {
      // Start with default config
      const defaultConfig = ConfigSchema.parse({});

      // Load file config
      let fileConfig = {};
      const configFileResult = await this.findConfigFile();
      if (!configFileResult.ok) {
        return err(new ConfigValidationError(configFileResult.error.message, []));
      }

      if (configFileResult.value) {
        const contentResult = await this.fileSystem.readFile(configFileResult.value);
        if (!contentResult.ok) {
          return err(new ConfigValidationError(`Failed to read config file: ${contentResult.error.message}`, []));
        }
        try {
          const parsed = parse(contentResult.value);
          fileConfig = parsed || {};
        } catch (error: unknown) {
          const message = getErrorMessage(error);
          return err(new ConfigValidationError(`Failed to parse config file: ${message}`, []));
        }
      }

      // Get environment config
      const envConfig = this.extractFromEnv();

      // Merge configs
      const merged = this.deepMerge(
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

      this.cachedConfig = parseResult.data;
      return ok(this.cachedConfig);
    } catch (error) {
      return err(
        new ConfigValidationError(
          `Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`,
          []
        )
      );
    }
  }

  getConfigDir(): Result<string, Error> {
    try {
      const configHome = Deno.env.get("XDG_CONFIG_HOME") ??
        join(Deno.env.get("HOME") || "", ".config");
      return ok(join(configHome, "locus"));
    } catch (error) {
      return err(
        new Error(`Failed to get config directory: ${error instanceof Error ? error.message : String(error)}`)
      );
    }
  }

  async createDefaultConfig(): Promise<Result<void, Error>> {
    const configDirResult = this.getConfigDir();
    if (!configDirResult.ok) {
      return err(configDirResult.error);
    }

    const configDir = configDirResult.value;
    const configPath = join(configDir, "settings.yml");

    const existsResult = await this.fileSystem.exists(configPath);
    if (!existsResult.ok) {
      return err(existsResult.error);
    }

    if (existsResult.value) {
      return ok(undefined);
    }

    const mkdirResult = await this.fileSystem.makeDir(configDir, { recursive: true });
    if (!mkdirResult.ok) {
      return err(mkdirResult.error);
    }

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

    const writeResult = await this.fileSystem.writeFile(configPath, yamlContent);
    if (!writeResult.ok) {
      return err(writeResult.error);
    }

    return ok(undefined);
  }

  overrideConfig(overrides: Partial<Config>): Result<void, Error> {
    try {
      if (this.cachedConfig) {
        this.cachedConfig = this.deepMerge(this.cachedConfig, overrides);
      }
      return ok(undefined);
    } catch (error) {
      return err(
        new Error(`Failed to override config: ${error instanceof Error ? error.message : String(error)}`)
      );
    }
  }

  resetCache(): void {
    this.cachedConfig = null;
  }

  async getConfig(): Promise<Result<Config, ConfigValidationError>> {
    return this.loadConfig();
  }

  /**
   * Find configuration file following XDG Base Directory specification
   */
  private async findConfigFile(): Promise<Result<string | null, Error>> {
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
        const existsResult = await this.fileSystem.exists(path);
        if (!existsResult.ok) {
          continue; // Skip if we can't check existence
        }
        if (existsResult.value) {
          return ok(path);
        }
      }

      return ok(null);
    } catch (error) {
      return err(
        new Error(`Failed to find config file: ${error instanceof Error ? error.message : String(error)}`)
      );
    }
  }

  /**
   * Extract configuration from environment variables
   */
  private extractFromEnv(): Partial<Config> {
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
      config.file_naming.hash_length = parseInt(env.LOCUS_FILE_NAMING_HASH_LENGTH, 10);
    }

    if (env.LOCUS_DEFAULT_STATUS) {
      if (!config.defaults) {
        config.defaults = { status: "", priority: "", tags: [] };
      }
      config.defaults.status = env.LOCUS_DEFAULT_STATUS;
    }

    if (env.LOCUS_DEFAULT_PRIORITY) {
      if (!config.defaults) {
        config.defaults = { status: "", priority: "", tags: [] };
      }
      config.defaults.priority = env.LOCUS_DEFAULT_PRIORITY;
    }

    if (env.LOCUS_DEFAULT_TAGS) {
      if (!config.defaults) {
        config.defaults = { status: "", priority: "", tags: [] };
      }
      config.defaults.tags = env.LOCUS_DEFAULT_TAGS.split(",").map((t) => t.trim());
    }

    return config;
  }

  /**
   * Deep merge objects (type-safe version)
   */
  private deepMerge<T extends Record<string, unknown>>(
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
          target[key] = this.deepMerge(
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
}