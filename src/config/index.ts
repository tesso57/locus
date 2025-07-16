import { Config } from "../types.ts";
import { ServiceContainer } from "../services/service-container.ts";

/**
 * @deprecated Use ConfigLoader service instead
 * This function is kept for backward compatibility
 */
export async function findConfigFile(): Promise<string | null> {
  console.warn("config/index.ts is deprecated. Use ConfigLoader service instead.");
  // This is now handled by ConfigLoader service
  return null;
}


/**
 * @deprecated Use ConfigLoader service instead
 * Load and merge configuration from all sources
 */
export async function loadConfig(forceReload = false): Promise<Config> {
  const container = ServiceContainer.getInstance();
  const configLoader = container.getConfigLoader();
  const result = await configLoader.loadConfig(forceReload);
  
  if (!result.ok) {
    throw result.error;
  }
  
  return result.value;
}

/**
 * @deprecated Use ConfigLoader service instead
 * Get configuration directory path
 */
export function getConfigDir(): string {
  const container = ServiceContainer.getInstance();
  const configLoader = container.getConfigLoader();
  const result = configLoader.getConfigDir();
  
  if (!result.ok) {
    throw result.error;
  }
  
  return result.value;
}

/**
 * @deprecated Use ConfigLoader service instead
 * Create default configuration file
 */
export async function createDefaultConfig(): Promise<void> {
  const container = ServiceContainer.getInstance();
  const configLoader = container.getConfigLoader();
  const result = await configLoader.createDefaultConfig();
  
  if (!result.ok) {
    throw result.error;
  }
}

/**
 * @deprecated Use ConfigLoader service instead
 * Override specific configuration values (useful for testing)
 */
export function overrideConfig(overrides: Partial<Config>): void {
  const container = ServiceContainer.getInstance();
  const configLoader = container.getConfigLoader();
  const result = configLoader.overrideConfig(overrides);
  
  if (!result.ok) {
    throw result.error;
  }
}

/**
 * @deprecated Use ConfigLoader service instead
 * Reset configuration cache
 */
export function resetConfigCache(): void {
  const container = ServiceContainer.getInstance();
  const configLoader = container.getConfigLoader();
  configLoader.resetCache();
}
