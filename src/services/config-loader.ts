import { Config } from "../types.ts";
import { Result } from "../utils/result.ts";
import { ConfigValidationError } from "../utils/errors.ts";

/**
 * Service for loading and managing application configuration
 */
export interface ConfigLoader {
  /**
   * Load and merge configuration from all sources
   * Priority: defaults < file config < env config
   */
  loadConfig(forceReload?: boolean): Promise<Result<Config, ConfigValidationError>>;

  /**
   * Get the configuration directory path
   */
  getConfigDir(): Result<string, Error>;

  /**
   * Create default configuration file if it doesn't exist
   */
  createDefaultConfig(): Promise<Result<void, Error>>;

  /**
   * Override specific configuration values (useful for testing)
   */
  overrideConfig(overrides: Partial<Config>): Result<void, Error>;

  /**
   * Reset configuration cache
   */
  resetCache(): void;

  /**
   * Get current configuration (loads if not cached)
   */
  getConfig(): Promise<Result<Config, ConfigValidationError>>;
}