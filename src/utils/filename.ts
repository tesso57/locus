import { loadConfig } from "../config/index.ts";
import { FileNameComponents } from "../types.ts";

/**
 * Generate a slug from a title
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
 * Generate a random hash
 */
export function generateHash(length: number = 8): string {
  const uuid = crypto.randomUUID();
  return uuid.replace(/-/g, "").substring(0, length);
}

/**
 * Format date according to pattern
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
 * Generate filename components
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
 * Generate a task filename
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
 * Parse filename to extract components
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
