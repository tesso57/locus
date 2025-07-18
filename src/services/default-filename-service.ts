import { Config, FileNameComponents } from "../types.ts";
import { err, ok, Result } from "../utils/result.ts";
import { FileNameService } from "./filename-service.ts";
import { I18nService } from "./i18n.ts";

/**
 * Default implementation of FileNameService.
 */
export class DefaultFileNameService implements FileNameService {
  constructor(
    private readonly config: Config,
    private readonly i18n: I18nService,
  ) {}

  generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "") // Keep Unicode letters, numbers, spaces, and hyphens
      .trim()
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
  }

  generateHash(length: number = 8): string {
    const uuid = crypto.randomUUID();
    return uuid.replace(/-/g, "").substring(0, length);
  }

  formatDate(date: Date, pattern: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return pattern
      .replace(/YYYY/g, String(year))
      .replace(/MM/g, month)
      .replace(/DD/g, day);
  }

  generateFileNameComponents(title: string): Result<FileNameComponents, Error> {
    try {
      const now = new Date();

      const components: FileNameComponents = {
        date: this.formatDate(now, this.config.file_naming.date_format),
        slug: this.generateSlug(title),
        hash: this.generateHash(this.config.file_naming.hash_length),
      };

      return ok(components);
    } catch (error) {
      return err(
        new Error(
          this.i18n.t("errors.filename.generateComponentsFailed", {
            error: error instanceof Error ? error.message : String(error),
          }),
        ),
      );
    }
  }

  generateFileName(title: string): Result<string, Error> {
    try {
      const componentsResult = this.generateFileNameComponents(title);
      if (!componentsResult.ok) {
        return componentsResult;
      }

      const components = componentsResult.value;

      // Replace tokens in pattern
      let fileName = this.config.file_naming.pattern
        .replace("{date}", components.date)
        .replace("{slug}", components.slug)
        .replace("{hash}", components.hash);

      // Ensure .md extension
      if (!fileName.endsWith(".md")) {
        fileName += ".md";
      }

      return ok(fileName);
    } catch (error) {
      return err(
        new Error(
          this.i18n.t("errors.filename.generateFailed", {
            error: error instanceof Error ? error.message : String(error),
          }),
        ),
      );
    }
  }

  parseFileName(fileName: string): Result<Partial<FileNameComponents>, Error> {
    try {
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

      return ok(components);
    } catch (error) {
      return err(
        new Error(
          this.i18n.t("errors.filename.parseFailed", {
            error: error instanceof Error ? error.message : String(error),
          }),
        ),
      );
    }
  }
}
