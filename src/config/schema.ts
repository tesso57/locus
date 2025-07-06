import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

/**
 * Git configuration schema
 */
export const GitConfigSchema = z.object({
  extract_username: z.boolean().default(true),
  username_from_remote: z.boolean().default(true),
});

/**
 * File naming configuration schema
 */
export const FileNamingConfigSchema = z.object({
  pattern: z.string().regex(/\{date\}|\{slug\}|\{hash\}/).default("{date}-{slug}-{hash}.md"),
  date_format: z.string().default("YYYY-MM-DD"),
  hash_length: z.number().int().min(4).max(32).default(8),
});

/**
 * Defaults configuration schema
 */
export const DefaultsConfigSchema = z.object({
  status: z.string().default("todo"),
  priority: z.string().default("normal"),
  tags: z.array(z.string()).default([]),
});

/**
 * Main configuration schema
 */
export const ConfigSchema = z.object({
  task_directory: z.string().default("~/locus"),
  git: GitConfigSchema,
  file_naming: FileNamingConfigSchema,
  defaults: DefaultsConfigSchema,
});

/**
 * Inferred types from schemas
 */
export type GitConfig = z.infer<typeof GitConfigSchema>;
export type FileNamingConfig = z.infer<typeof FileNamingConfigSchema>;
export type DefaultsConfig = z.infer<typeof DefaultsConfigSchema>;
export type Config = z.infer<typeof ConfigSchema>;
