import { parse, stringify } from "@std/yaml";
import { FrontMatter, ParsedMarkdown } from "../types.ts";

/**
 * Parse markdown content with frontmatter
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
 * Generate markdown content with frontmatter
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
 * Ensure filename has .md extension
 */
export function ensureMarkdownExtension(fileName: string): string {
  return fileName.endsWith(".md") ? fileName : `${fileName}.md`;
}

/**
 * Validate filename for security
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
 * Merge frontmatter objects
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
