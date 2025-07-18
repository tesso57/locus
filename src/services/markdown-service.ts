import { FrontMatter, ParsedMarkdown } from "../types.ts";
import { Result } from "../utils/result.ts";

/**
 * Service for handling markdown-related operations including
 * frontmatter parsing, generation, and validation.
 */
export interface MarkdownService {
  /**
   * Parses markdown content that may contain YAML frontmatter.
   *
   * @param content - The markdown content to parse
   * @returns Result containing ParsedMarkdown or error
   */
  parseMarkdown(content: string): Result<ParsedMarkdown, Error>;

  /**
   * Generates markdown content with YAML frontmatter.
   *
   * @param frontmatter - The frontmatter object to serialize, or null
   * @param body - The markdown body content
   * @returns Result containing complete markdown string or error
   */
  generateMarkdown(
    frontmatter: FrontMatter | null,
    body: string,
  ): Result<string, Error>;

  /**
   * Ensures a filename has the .md extension.
   *
   * @param fileName - The filename to check
   * @returns The filename with .md extension
   */
  ensureMarkdownExtension(fileName: string): string;

  /**
   * Validates a filename for security and filesystem compatibility.
   *
   * @param fileName - The filename to validate
   * @returns Result indicating success or validation error
   */
  validateFileName(fileName: string): Result<void, Error>;

  /**
   * Merges frontmatter objects with special handling for arrays.
   *
   * @param existing - The existing frontmatter object or null
   * @param updates - Partial updates to apply
   * @returns New frontmatter object with updates applied
   */
  mergeFrontmatter(
    existing: FrontMatter | null,
    updates: Partial<FrontMatter>,
  ): FrontMatter;

  /**
   * Extract title from markdown body.
   *
   * @param body - The markdown body to extract title from
   * @returns Result containing title or null if not found
   */
  extractTitle(body: string): Result<string | null, Error>;

  /**
   * Create task markdown content with default frontmatter.
   *
   * @param title - The task title
   * @param body - Optional markdown body
   * @param frontmatter - Optional frontmatter overrides
   * @returns Result containing complete markdown or error
   */
  createTaskMarkdown(
    title: string,
    body?: string,
    frontmatter?: FrontMatter,
  ): Result<string, Error>;
}
