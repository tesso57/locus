import { Config } from "../types.ts";

export const DEFAULT_CONFIG: Config = {
  task_directory: "~/locus",
  language: {
    default: "en",
  },
  git: {
    extract_username: true,
    username_from_remote: true,
  },
  file_naming: {
    pattern: "{slug}.md",
    date_format: "YYYY-MM-DD",
    hash_length: 8,
  },
  defaults: {
    status: "todo",
    priority: "normal",
    tags: [],
  },
};
