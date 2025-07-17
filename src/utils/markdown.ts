import { parse, stringify } from "@std/yaml";
import { FrontMatter, ParsedMarkdown } from "../types.ts";

/**
 * Parses markdown content that may contain YAML frontmatter.
 *
 * Frontmatter must be delimited by --- at the beginning and end.
 * If parsing fails or no frontmatter is found, returns the entire
 * content as the body with null frontmatter.
 *
 * @param content - The markdown content to parse
 * @returns ParsedMarkdown object with separated frontmatter and body
 *
 * @example
 * ```typescript
 * const content = `---
 * title: My Task
 * status: todo
 * ---
 * # Task Content
 *
 * Description here...`;
 *
 * const { frontmatter, body } = parseMarkdown(content);
 * console.log(frontmatter?.title); // "My Task"
 * console.log(body); // "# Task Content\n\nDescription here..."
 * ```
 *
 * @since 0.1.0
 */
export function parseMarkdown(content: string): ParsedMarkdown {
  const lines = content.split("\n");

  if (lines[0] !== "---") {
    return { frontmatter: null, body: content };
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return { frontmatter: null, body: content };
  }

  const yamlContent = lines.slice(1, endIndex).join("\n");
  const body = lines.slice(endIndex + 1).join("\n");

  try {
    const frontmatter = parse(yamlContent) as FrontMatter;
    return { frontmatter, body };
  } catch {
    return { frontmatter: null, body: content };
  }
}

/**
 * Generates markdown content with YAML frontmatter.
 *
 * If frontmatter is null or empty, returns only the body.
 * Otherwise, creates properly formatted markdown with YAML
 * frontmatter delimited by ---.
 *
 * @param frontmatter - The frontmatter object to serialize, or null
 * @param body - The markdown body content
 * @returns Complete markdown string with frontmatter (if provided)
 *
 * @example
 * ```typescript
 * const frontmatter = {
 *   title: "My Task",
 *   status: "todo",
 *   tags: ["important", "feature"]
 * };
 *
 * const markdown = generateMarkdown(frontmatter, "# Task Content\n\nDetails...");
 * // Returns:
 * // ---
 * // title: My Task
 * // status: todo
 * // tags:
 * //   - important
 * //   - feature
 * // ---
 * // # Task Content
 * //
 * // Details...
 * ```
 *
 * @since 0.1.0
 */
export function generateMarkdown(
  frontmatter: FrontMatter | null,
  body: string,
): string {
  if (!frontmatter || Object.keys(frontmatter).length === 0) {
    return body;
  }

  const yamlContent = stringify(frontmatter, {
    lineWidth: -1, // Disable line wrapping
    useAnchors: false, // Disable anchors and aliases
  }).trim();

  return `---\n${yamlContent}\n---\n${body}`;
}

/**
 * Ensures a filename has the .md extension.
 *
 * If the filename already ends with .md, returns it unchanged.
 * Otherwise, appends .md to the filename.
 *
 * @param fileName - The filename to check
 * @returns The filename with .md extension
 *
 * @example
 * ```typescript
 * ensureMarkdownExtension("task");       // "task.md"
 * ensureMarkdownExtension("task.md");    // "task.md"
 * ensureMarkdownExtension("task.txt");   // "task.txt.md"
 * ```
 *
 * @since 0.1.0
 */
export function ensureMarkdownExtension(fileName: string): string {
  return fileName.endsWith(".md") ? fileName : `${fileName}.md`;
}

/**
 * Validates a filename for security and filesystem compatibility.
 *
 * Checks for:
 * - Path separators (/ or \)
 * - Relative path components (..)
 * - Empty filenames
 * - Excessive length (>255 characters)
 * - Invalid characters for common filesystems
 *
 * @param fileName - The filename to validate
 * @throws {Error} If the filename contains invalid characters or patterns
 *
 * @example
 * ```typescript
 * validateFileName("task.md");           // OK
 * validateFileName("my-task-123.md");    // OK
 * validateFileName("../evil.md");        // Throws Error
 * validateFileName("path/to/file.md");   // Throws Error
 * validateFileName("file:name.md");      // Throws Error
 * ```
 *
 * @since 0.1.0
 */
export function validateFileName(fileName: string): void {
  if (fileName.includes("/") || fileName.includes("\\")) {
    throw new Error("ファイル名にパス区切り文字（/や\\）を含めることはできません");
  }

  if (fileName.includes("..")) {
    throw new Error("ファイル名に相対パス（..）を含めることはできません");
  }

  if (fileName.length === 0) {
    throw new Error("ファイル名が空です");
  }

  if (fileName.length > 255) {
    throw new Error("ファイル名が長すぎます（最大255文字）");
  }

  // Check for invalid characters
  // deno-lint-ignore no-control-regex
  const invalidChars = /[<>:"|?*\x00-\x1f]/;
  if (invalidChars.test(fileName)) {
    throw new Error("ファイル名に無効な文字が含まれています");
  }
}

/**
 * Merges frontmatter objects with special handling for arrays.
 *
 * - For array fields (like tags), replaces the entire array
 * - For other fields, performs shallow merge
 * - Null/undefined values in updates remove the field
 *
 * @param existing - The existing frontmatter object or null
 * @param updates - Partial updates to apply
 * @returns New frontmatter object with updates applied
 *
 * @example
 * ```typescript
 * const existing = {
 *   status: "todo",
 *   tags: ["feature"],
 *   priority: "high"
 * };
 *
 * const updated = mergeFrontmatter(existing, {
 *   status: "done",
 *   tags: ["feature", "completed"],
 *   priority: null  // This will remove the priority field
 * });
 *
 * // Result: { status: "done", tags: ["feature", "completed"] }
 * ```
 *
 * @since 0.1.0
 */
export function mergeFrontmatter(
  existing: FrontMatter | null,
  updates: Partial<FrontMatter>,
): FrontMatter {
  const base = existing || {};

  // Handle special array fields
  if (updates.tags && Array.isArray(updates.tags)) {
    // Replace tags array entirely
    return { ...base, ...updates };
  }

  return { ...base, ...updates };
}

/**
 * Extract title from markdown body
 */
export function extractTitle(body: string): string | null {
  const lines = body.trim().split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("# ")) {
      return trimmed.substring(2).trim();
    }
  }

  return null;
}

/**
 * Create task markdown content
 */
export function createTaskMarkdown(
  title: string,
  body: string = "",
  frontmatter: FrontMatter = {},
): string {
  const now = new Date().toISOString();

  const defaultFrontmatter: FrontMatter = {
    date: now.split("T")[0], // YYYY-MM-DD format
    created: now,
    ...frontmatter,
  };

  const markdownBody = body || `# ${title}\n\n`;

  return generateMarkdown(defaultFrontmatter, markdownBody);
}
