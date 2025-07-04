// Configuration types
export interface Config {
  task_directory: string;
  git: GitConfig;
  file_naming: FileNamingConfig;
  defaults: DefaultsConfig;
}

export interface GitConfig {
  extract_username: boolean;
  username_from_remote: boolean;
}

export interface FileNamingConfig {
  pattern: string;
  date_format: string;
  hash_length: number;
}

export interface DefaultsConfig {
  status: string;
  priority: string;
  tags: string[];
}

// Task file related types
export interface TaskConfig {
  taskDir: string;
  repoInfo?: RepoInfo;
}

export interface FrontMatter {
  [key: string]: unknown;
  date?: string;
  created?: string;
  status?: string;
  tags?: string[];
  priority?: string;
}

export interface ParsedMarkdown {
  frontmatter: FrontMatter | null;
  body: string;
}

// Command options
export interface AddOptions {
  title: string;
  body?: string;
  tags?: string[];
  priority?: string;
  status?: string;
}

export interface TagsListOptions {
  fileName?: string;
}

export interface TagsGetOptions {
  fileName: string;
  property: string;
}

export interface TagsSetOptions {
  fileName: string;
  property: string;
  value: string;
}

export interface TagsRemoveOptions {
  fileName: string;
  property: string;
}

export interface TagsClearOptions {
  fileName: string;
}

// Git related types
export interface GitInfo {
  isRepo: boolean;
  root?: string;
  remoteUrl?: string;
}

export interface RepoInfo {
  host: string;
  owner: string;
  repo: string;
}

// Utility types
export interface FileNameComponents {
  date: string;
  slug: string;
  hash: string;
}