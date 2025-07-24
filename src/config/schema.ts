import { z } from "zod";

/**
 * Git configuration schema
 */
export const GitConfigSchema: z.ZodObject<{
  extract_username: z.ZodDefault<z.ZodBoolean>;
  username_from_remote: z.ZodDefault<z.ZodBoolean>;
}> = z.object({
  extract_username: z.boolean().default(true),
  username_from_remote: z.boolean().default(true),
});

/**
 * File naming configuration schema
 */
export const FileNamingConfigSchema: z.ZodObject<{
  pattern: z.ZodDefault<z.ZodString>;
  date_format: z.ZodDefault<z.ZodString>;
  hash_length: z.ZodDefault<z.ZodNumber>;
}> = z.object({
  pattern: z.string().regex(/\{date\}|\{slug\}|\{hash\}/).default("{slug}.md"),
  date_format: z.string().default("YYYY-MM-DD"),
  hash_length: z.number().int().min(4).max(32).default(8),
});

/**
 * Defaults configuration schema
 */
export const DefaultsConfigSchema: z.ZodObject<{
  status: z.ZodDefault<z.ZodString>;
  priority: z.ZodDefault<z.ZodString>;
  tags: z.ZodDefault<z.ZodArray<z.ZodString>>;
  custom: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}> = z.object({
  status: z.string().default("todo"),
  priority: z.string().default("normal"),
  tags: z.array(z.string()).default([]),
  custom: z.record(z.unknown()).default({}),
});

/**
 * Language configuration schema
 */
export const LanguageConfigSchema: z.ZodObject<{
  default: z.ZodDefault<z.ZodEnum<["ja", "en"]>>;
}> = z.object({
  default: z.enum(["ja", "en"]).default("en"),
});

/**
 * Main configuration schema
 */
export const ConfigSchema: z.ZodObject<{
  task_directory: z.ZodDefault<z.ZodString>;
  language: typeof LanguageConfigSchema;
  git: typeof GitConfigSchema;
  file_naming: typeof FileNamingConfigSchema;
  defaults: typeof DefaultsConfigSchema;
}> = z.object({
  task_directory: z.string().default("~/locus"),
  language: LanguageConfigSchema,
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
export type LanguageConfig = z.infer<typeof LanguageConfigSchema>;
export type Config = z.infer<typeof ConfigSchema>;
