import { Config } from "../types.ts";

export const DEFAULT_CONFIG: Config = {
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
};
