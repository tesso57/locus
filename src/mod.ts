// Library exports for programmatic usage

// Type exports
export * from "./types.ts";

// Configuration exports
export {
  createDefaultConfig,
  findConfigFile,
  getConfigDir,
  loadConfig,
  overrideConfig,
  resetConfigCache,
} from "./config/index.ts";
export { DEFAULT_CONFIG } from "./config/defaults.ts";

// Utility exports
export * from "./utils/git.ts";
export * from "./utils/markdown.ts";
export * from "./utils/path.ts";
export * from "./utils/filename.ts";

// Command creation functions for extensibility
export { createAddCommand } from "./commands/add.ts";
export { createTagsCommand } from "./commands/tags.ts";
export { createConfigCommand } from "./commands/config.ts";
