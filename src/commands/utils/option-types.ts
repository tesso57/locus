import { BaseCommandOptions } from "./command-helpers.ts";

/**
 * Options for the add command
 */
export interface AddOptions extends BaseCommandOptions {
  tags?: string[];
  priority?: string;
  status?: string;
  noGit?: boolean;
}

/**
 * Options for the read command
 */
export interface ReadOptions extends BaseCommandOptions {
  raw?: boolean;
  noGit?: boolean;
  pager?: string;
}

/**
 * Options for the path command
 */
export interface PathOptions extends BaseCommandOptions {
  noGit?: boolean;
  all?: boolean;
}

/**
 * Options for the list command
 */
export interface ListOptions extends BaseCommandOptions {
  status?: string;
  priority?: string;
  tags?: string[];
  all?: boolean;
  noGit?: boolean;
  filter?: string;
  format?: string;
}

/**
 * Options for the tags command
 */
export interface TagsOptions extends BaseCommandOptions {
  all?: boolean;
  noGit?: boolean;
}

/**
 * Options for the config command
 */
export interface ConfigOptions extends BaseCommandOptions {
  get?: string;
  set?: string;
  unset?: string;
  list?: boolean;
  edit?: boolean;
}

/**
 * Options for the update command
 */
export interface UpdateOptions extends BaseCommandOptions {
  title?: string;
  body?: string;
  tags?: string[];
  priority?: string;
  status?: string;
  append?: boolean;
  noGit?: boolean;
}
