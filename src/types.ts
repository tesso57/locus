/**
 * @module types
 * 
 * Core type definitions for the Locus task management system.
 * This module exports all the primary types and interfaces used throughout the application.
 */

// Re-export configuration types from schema
export type { Config, DefaultsConfig, FileNamingConfig, GitConfig } from "./config/schema.ts";

// Task file related types
/**
 * Configuration for task operations.
 * 
 * @since 0.1.0
 */
export interface TaskConfig {
  /** Directory where tasks are stored */
  taskDir: string;
  
  /** Repository information if in a Git repository */
  repoInfo?: RepoInfo;
}

/**
 * YAML frontmatter structure for task files.
 * 
 * Supports standard fields like date, status, tags, and priority,
 * as well as arbitrary custom fields. All fields are optional.
 * 
 * @example
 * ```yaml
 * ---
 * date: 2024-01-15
 * created: 2024-01-15T10:30:00Z
 * status: todo
 * priority: high
 * tags: [feature, backend]
 * custom_field: value
 * ---
 * ```
 * 
 * @since 0.1.0
 */
export interface FrontMatter {
  /** Allow arbitrary additional properties */
  [key: string]: unknown;
  
  /** Date in YYYY-MM-DD format */
  date?: string;
  
  /** ISO 8601 timestamp when task was created */
  created?: string;
  
  /** Task status (e.g., "todo", "in-progress", "done") */
  status?: string;
  
  /** Array of tags for categorization */
  tags?: string[];
  
  /** Priority level (e.g., "high", "medium", "low") */
  priority?: string;
}

/**
 * Result of parsing a markdown file with optional YAML frontmatter.
 * 
 * @example
 * ```typescript
 * const parsed = parseMarkdown(content);
 * if (parsed.frontmatter) {
 *   console.log(`Status: ${parsed.frontmatter.status}`);
 * }
 * console.log(`Content: ${parsed.body}`);
 * ```
 * 
 * @since 0.1.0
 */
export interface ParsedMarkdown {
  /** Parsed YAML frontmatter or null if not present */
  frontmatter: FrontMatter | null;
  
  /** Markdown body content (without frontmatter) */
  body: string;
}

// Command options

/**
 * Options for the 'add' command to create a new task.
 * 
 * @since 0.1.0
 */
export interface AddOptions {
  /** Task title (required) */
  title: string;
  
  /** Optional task body content */
  body?: string;
  
  /** Tags to assign to the task */
  tags?: string[];
  
  /** Priority level */
  priority?: string;
  
  /** Initial status */
  status?: string;
}

/**
 * Options for the 'tags list' subcommand.
 * 
 * @since 0.1.0
 */
export interface TagsListOptions {
  /** Optional file name to list properties for a specific task */
  fileName?: string;
}

/**
 * Options for the 'tags get' subcommand.
 * 
 * @since 0.1.0
 */
export interface TagsGetOptions {
  /** Task file name */
  fileName: string;
  
  /** Property name to retrieve */
  property: string;
}

/**
 * Options for the 'tags set' subcommand.
 * 
 * @since 0.1.0
 */
export interface TagsSetOptions {
  /** Task file name */
  fileName: string;
  
  /** Property name to set */
  property: string;
  
  /** Value to set for the property */
  value: string;
}

/**
 * Options for the 'tags remove' subcommand.
 * 
 * @since 0.1.0
 */
export interface TagsRemoveOptions {
  /** Task file name */
  fileName: string;
  
  /** Property name to remove */
  property: string;
}

/**
 * Options for the 'tags clear' subcommand.
 * 
 * @since 0.1.0
 */
export interface TagsClearOptions {
  /** Task file name to clear all properties from */
  fileName: string;
}

// Git related types

/**
 * Information about a Git repository.
 * 
 * @since 0.1.0
 */
export interface GitInfo {
  /** Whether the current directory is inside a Git repository */
  isRepo: boolean;
  
  /** Absolute path to the repository root */
  root?: string;
  
  /** Remote URL (e.g., "https://github.com/owner/repo.git") */
  remoteUrl?: string;
}

/**
 * Parsed repository information from a Git remote URL.
 * 
 * @example
 * ```typescript
 * // From URL: https://github.com/alice/project.git
 * const repoInfo: RepoInfo = {
 *   host: "github.com",
 *   owner: "alice",
 *   repo: "project"
 * };
 * ```
 * 
 * @since 0.1.0
 */
export interface RepoInfo {
  /** Git host (e.g., "github.com", "gitlab.com") */
  host: string;
  
  /** Repository owner or organization name */
  owner: string;
  
  /** Repository name */
  repo: string;
}

// Utility types

/**
 * Components used in generating task file names.
 * 
 * @example
 * ```typescript
 * const components: FileNameComponents = {
 *   date: "2024-01-15",
 *   slug: "meeting-notes",
 *   hash: "abc12345"
 * };
 * // Results in: "2024-01-15-meeting-notes-abc12345.md"
 * ```
 * 
 * @since 0.1.0
 */
export interface FileNameComponents {
  /** Date in YYYY-MM-DD format */
  date: string;
  
  /** URL-safe slug generated from task title */
  slug: string;
  
  /** Random hash for uniqueness (typically 8 characters) */
  hash: string;
}
