/**
 * @module locus
 *
 * Locus - A Git-aware task management CLI tool built with Deno.
 *
 * This module provides the public API for programmatic usage of Locus functionality.
 * It exports types, configuration utilities, markdown processing functions, and
 * command creation functions that can be used to build custom task management tools
 * or integrate Locus functionality into other applications.
 *
 * @example
 * ```typescript
 * import { loadConfig, parseMarkdown, createAddCommand } from "@tesso/locus";
 *
 * // Load configuration
 * const configResult = await loadConfig();
 * if (configResult.ok) {
 *   console.log("Config loaded:", configResult.value);
 * }
 *
 * // Parse a markdown task file
 * const { frontmatter, body } = parseMarkdown(markdownContent);
 * ```
 */

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

// Service exports
export type { MarkdownService } from "./services/markdown-service.ts";
export { DefaultMarkdownService } from "./services/default-markdown-service.ts";
export type { FileNameService } from "./services/filename-service.ts";
export { DefaultFileNameService } from "./services/default-filename-service.ts";

// Command creation functions for extensibility
export { createAddCommand } from "./commands/add.ts";
export { createTagsCommand } from "./commands/tags.ts";
export { createConfigCommand } from "./commands/config.ts";
