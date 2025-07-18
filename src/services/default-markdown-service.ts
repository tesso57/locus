import { parse, stringify } from "@std/yaml";
import { FrontMatter, ParsedMarkdown } from "../types.ts";
import { ok, err, Result } from "../utils/result.ts";
import { MarkdownService } from "./markdown-service.ts";
import { I18nService } from "./i18n.ts";

/**
 * Default implementation of MarkdownService.
 */
export class DefaultMarkdownService implements MarkdownService {
  constructor(private readonly i18n: I18nService) {}

  parseMarkdown(content: string): Result<ParsedMarkdown, Error> {
    try {
      const lines = content.split("\n");

      if (lines[0] !== "---") {
        return ok({ frontmatter: null, body: content });
      }

      let endIndex = -1;
      for (let i = 1; i < lines.length; i++) {
        if (lines[i] === "---") {
          endIndex = i;
          break;
        }
      }

      if (endIndex === -1) {
        return ok({ frontmatter: null, body: content });
      }

      const yamlContent = lines.slice(1, endIndex).join("\n");
      const body = lines.slice(endIndex + 1).join("\n");

      try {
        const frontmatter = parse(yamlContent) as FrontMatter;
        return ok({ frontmatter, body });
      } catch (error) {
        // If YAML parsing fails, treat the entire content as body
        return ok({ frontmatter: null, body: content });
      }
    } catch (error) {
      return err(
        new Error(
          this.i18n.t("errors.markdown.parseFailed", {
            error: error instanceof Error ? error.message : String(error),
          }),
        ),
      );
    }
  }

  generateMarkdown(
    frontmatter: FrontMatter | null,
    body: string,
  ): Result<string, Error> {
    try {
      if (!frontmatter || Object.keys(frontmatter).length === 0) {
        return ok(body);
      }

      const yamlContent = stringify(frontmatter, {
        lineWidth: -1, // Disable line wrapping
        useAnchors: false, // Disable anchors and aliases
      }).trim();

      return ok(`---\n${yamlContent}\n---\n${body}`);
    } catch (error) {
      return err(
        new Error(
          this.i18n.t("errors.markdown.generateFailed", {
            error: error instanceof Error ? error.message : String(error),
          }),
        ),
      );
    }
  }

  ensureMarkdownExtension(fileName: string): string {
    return fileName.endsWith(".md") ? fileName : `${fileName}.md`;
  }

  validateFileName(fileName: string): Result<void, Error> {
    if (fileName.includes("/") || fileName.includes("\\")) {
      return err(
        new Error(this.i18n.t("errors.filename.pathSeparator")),
      );
    }

    if (fileName.includes("..")) {
      return err(
        new Error(this.i18n.t("errors.filename.relativePath")),
      );
    }

    if (fileName.length === 0) {
      return err(
        new Error(this.i18n.t("errors.filename.empty")),
      );
    }

    if (fileName.length > 255) {
      return err(
        new Error(this.i18n.t("errors.filename.tooLong")),
      );
    }

    // Check for invalid characters
    // deno-lint-ignore no-control-regex
    const invalidChars = /[<>:"|?*\x00-\x1f]/;
    if (invalidChars.test(fileName)) {
      return err(
        new Error(this.i18n.t("errors.filename.invalidChars")),
      );
    }

    return ok(undefined);
  }

  mergeFrontmatter(
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

  extractTitle(body: string): Result<string | null, Error> {
    try {
      const lines = body.trim().split("\n");

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("# ")) {
          return ok(trimmed.substring(2).trim());
        }
      }

      return ok(null);
    } catch (error) {
      return err(
        new Error(
          this.i18n.t("errors.markdown.extractTitleFailed", {
            error: error instanceof Error ? error.message : String(error),
          }),
        ),
      );
    }
  }

  createTaskMarkdown(
    title: string,
    body: string = "",
    frontmatter: FrontMatter = {},
  ): Result<string, Error> {
    try {
      const now = new Date().toISOString();

      const defaultFrontmatter: FrontMatter = {
        date: now.split("T")[0], // YYYY-MM-DD format
        created: now,
        ...frontmatter,
      };

      const markdownBody = body || `# ${title}\n\n`;

      return this.generateMarkdown(defaultFrontmatter, markdownBody);
    } catch (error) {
      return err(
        new Error(
          this.i18n.t("errors.markdown.createFailed", {
            error: error instanceof Error ? error.message : String(error),
          }),
        ),
      );
    }
  }
}
