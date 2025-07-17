import { loadConfig } from "../config/index.ts";
import { FileNameComponents } from "../types.ts";

/**
 * Generates a URL-safe slug from a title.
 * 
 * Converts the title to lowercase, removes special characters (keeping Unicode letters,
 * numbers, spaces, and hyphens), replaces spaces with hyphens, and ensures no
 * leading/trailing hyphens.
 * 
 * @param title - The title to convert to a slug
 * @returns A URL-safe slug string
 * 
 * @example
 * ```typescript
 * generateSlug("Hello World!");        // "hello-world"
 * generateSlug("日本語のタイトル");     // "日本語のタイトル"
 * generateSlug("Test   123");          // "test-123"
 * generateSlug("--Test--");            // "test"
 * ```
 * 
 * @since 0.1.0
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "") // Keep Unicode letters, numbers, spaces, and hyphens
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Generates a random hash string for unique identification.
 * 
 * Uses crypto.randomUUID() to generate a cryptographically secure random
 * identifier and truncates it to the specified length.
 * 
 * @param length - The desired length of the hash (default: 8)
 * @returns A random alphanumeric hash string
 * 
 * @example
 * ```typescript
 * generateHash();     // e.g., "a1b2c3d4"
 * generateHash(6);    // e.g., "f5e4d3"
 * generateHash(12);   // e.g., "a1b2c3d4e5f6"
 * ```
 * 
 * @since 0.1.0
 */
export function generateHash(length: number = 8): string {
  const uuid = crypto.randomUUID();
  return uuid.replace(/-/g, "").substring(0, length);
}

/**
 * Formats a date according to the specified pattern.
 * 
 * Supports the following tokens:
 * - YYYY: 4-digit year
 * - MM: 2-digit month (01-12)
 * - DD: 2-digit day (01-31)
 * 
 * @param date - The date to format
 * @param pattern - The format pattern (e.g., "YYYY-MM-DD")
 * @returns The formatted date string
 * 
 * @example
 * ```typescript
 * const date = new Date(2024, 0, 15); // January 15, 2024
 * formatDate(date, "YYYY-MM-DD");     // "2024-01-15"
 * formatDate(date, "DD/MM/YYYY");     // "15/01/2024"
 * formatDate(date, "YYYY年MM月DD日");  // "2024年01月15日"
 * ```
 * 
 * @since 0.1.0
 */
export function formatDate(date: Date, pattern: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return pattern
    .replace(/YYYY/g, String(year))
    .replace(/MM/g, month)
    .replace(/DD/g, day);
}

/**
 * Generates all components needed for creating a task filename.
 * 
 * Uses configuration settings to determine date format and hash length.
 * Components include formatted date, slug from title, and random hash.
 * 
 * @param title - The task title to generate components from
 * @returns Promise resolving to FileNameComponents object
 * 
 * @example
 * ```typescript
 * const components = await generateFileNameComponents("Project Meeting");
 * // Returns:
 * // {
 * //   date: "2024-01-15",
 * //   slug: "project-meeting",
 * //   hash: "a1b2c3d4"
 * // }
 * ```
 * 
 * @since 0.1.0
 */
export async function generateFileNameComponents(title: string): Promise<FileNameComponents> {
  const config = await loadConfig();
  const now = new Date();

  return {
    date: formatDate(now, config.file_naming.date_format),
    slug: generateSlug(title),
    hash: generateHash(config.file_naming.hash_length),
  };
}

/**
 * Generates a complete task filename based on the configured pattern.
 * 
 * Uses the file naming pattern from configuration and replaces tokens:
 * - {date}: Current date in configured format
 * - {slug}: URL-safe version of the title
 * - {hash}: Random identifier for uniqueness
 * 
 * Automatically appends .md extension if not present.
 * 
 * @param title - The task title
 * @returns Promise resolving to the generated filename
 * 
 * @example
 * ```typescript
 * // With default pattern "{date}-{slug}-{hash}"
 * const filename = await generateFileName("Weekly Review");
 * // Returns: "2024-01-15-weekly-review-a1b2c3d4.md"
 * 
 * // With pattern "{slug}-{date}"
 * const filename = await generateFileName("Task");
 * // Returns: "task-2024-01-15.md"
 * ```
 * 
 * @since 0.1.0
 */
export async function generateFileName(title: string): Promise<string> {
  const config = await loadConfig();
  const components = await generateFileNameComponents(title);

  // Replace tokens in pattern
  let fileName = config.file_naming.pattern
    .replace("{date}", components.date)
    .replace("{slug}", components.slug)
    .replace("{hash}", components.hash);

  // Ensure .md extension
  if (!fileName.endsWith(".md")) {
    fileName += ".md";
  }

  return fileName;
}

/**
 * Parses a filename to extract its components.
 * 
 * Attempts to identify date, slug, and hash components from the filename.
 * Returns partial components as not all filenames may contain all parts.
 * 
 * @param fileName - The filename to parse (with or without .md extension)
 * @returns Partial FileNameComponents that could be extracted
 * 
 * @example
 * ```typescript
 * parseFileName("2024-01-15-meeting-notes-a1b2c3d4.md");
 * // Returns: {
 * //   date: "2024-01-15",
 * //   slug: "meeting-notes",
 * //   hash: "a1b2c3d4"
 * // }
 * 
 * parseFileName("simple-task.md");
 * // Returns: {
 * //   slug: "simple-task"
 * // }
 * ```
 * 
 * @since 0.1.0
 */
export function parseFileName(fileName: string): Partial<FileNameComponents> {
  const withoutExt = fileName.replace(/\.md$/, "");
  const parts = withoutExt.split("-");

  const components: Partial<FileNameComponents> = {};

  // Try to extract date (assuming YYYY-MM-DD format at the beginning)
  if (parts.length >= 3) {
    const possibleDate = parts.slice(0, 3).join("-");
    if (/^\d{4}-\d{2}-\d{2}$/.test(possibleDate)) {
      components.date = possibleDate;
      parts.splice(0, 3);
    }
  }

  // Try to extract hash (assuming it's the last part and alphanumeric)
  if (parts.length > 0) {
    const lastPart = parts[parts.length - 1];
    if (/^[a-z0-9]+$/i.test(lastPart) && lastPart.length <= 16) {
      components.hash = lastPart;
      parts.pop();
    }
  }

  // Remaining parts form the slug
  if (parts.length > 0) {
    components.slug = parts.join("-");
  }

  return components;
}
