import { Config } from "../../src/types.ts";
import { ConfigLoader } from "../../src/services/config-loader.ts";
import { err, ok, Result } from "../../src/utils/result.ts";
import { ConfigValidationError } from "../../src/utils/errors.ts";

/**
 * Mock implementation of ConfigLoader for testing
 */
export class MockConfigLoader implements ConfigLoader {
  private config: Config;
  private configDir: string = "/test/.config/locus";
  private shouldFailLoad = false;
  private shouldFailCreate = false;

  constructor(config?: Partial<Config>) {
    // Default test config
    this.config = {
      task_directory: "~/locus",
      git: {
        extract_username: true,
        username_from_remote: true,
      },
      file_naming: {
        pattern: "{date}-{slug}-{hash}.md",
        date_format: "YYYY-MM-DD",
        hash_length: 8,
      },
      defaults: {
        status: "todo",
        priority: "normal",
        tags: [],
      },
      language: {
        default: "ja",
      },
      ...config,
    } as Config;
  }

  loadConfig(_forceReload?: boolean): Promise<Result<Config, ConfigValidationError>> {
    if (this.shouldFailLoad) {
      return Promise.resolve(err(new ConfigValidationError("Mock load error", [])));
    }
    return Promise.resolve(ok(this.config));
  }

  getConfigDir(): Result<string, Error> {
    return ok(this.configDir);
  }

  createDefaultConfig(): Promise<Result<void, Error>> {
    if (this.shouldFailCreate) {
      return Promise.resolve(err(new Error("Mock create error")));
    }
    return Promise.resolve(ok(undefined));
  }

  overrideConfig(overrides: Partial<Config>): Result<void, Error> {
    this.config = { ...this.config, ...overrides };
    return ok(undefined);
  }

  resetCache(): void {
    // No-op for mock
  }

  getConfig(): Promise<Result<Config, ConfigValidationError>> {
    return this.loadConfig();
  }

  // Test helper methods
  setConfig(config: Config): void {
    this.config = config;
  }

  setShouldFailLoad(shouldFail: boolean): void {
    this.shouldFailLoad = shouldFail;
  }

  setShouldFailCreate(shouldFail: boolean): void {
    this.shouldFailCreate = shouldFail;
  }

  setConfigDir(dir: string): void {
    this.configDir = dir;
  }
}
