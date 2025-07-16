import { colors } from "@cliffy/ansi/colors";
import { FormatService } from "./format-service.ts";
import { I18nService } from "./i18n.ts";
import { TaskInfo } from "./task-service.ts";
import { ok, Result } from "../utils/result.ts";

/**
 * Default implementation of FormatService
 */
export class DefaultFormatService implements FormatService {
  constructor(
    private readonly i18n: I18nService,
  ) {}

  /**
   * Format task status with color and icon
   */
  formatStatus(status: string): string {
    switch (status) {
      case "todo":
        return colors.yellow(this.i18n.t("format.status.todo"));
      case "in_progress":
        return colors.blue(this.i18n.t("format.status.inProgress"));
      case "done":
        return colors.green(this.i18n.t("format.status.done"));
      case "cancelled":
        return colors.gray(this.i18n.t("format.status.cancelled"));
      default:
        return status;
    }
  }

  /**
   * Format task priority with color and icon
   */
  formatPriority(priority: string): string {
    switch (priority) {
      case "high":
        return colors.red(this.i18n.t("format.priority.high"));
      case "normal":
        return colors.yellow(this.i18n.t("format.priority.medium"));
      case "low":
        return colors.green(this.i18n.t("format.priority.low"));
      default:
        return priority;
    }
  }

  /**
   * Format date relative to current time
   */
  formatDate(date: Date | string, _format?: string): string {
    const dateStr = date instanceof Date ? date.toISOString() : date;

    if (!dateStr) return colors.gray(this.i18n.t("format.date.unknown"));

    try {
      const dateObj = date instanceof Date ? date : new Date(dateStr);

      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        return colors.gray(this.i18n.t("format.date.unknown"));
      }

      const now = new Date();
      const diffMs = now.getTime() - dateObj.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return colors.green(this.i18n.t("format.date.today"));
      } else if (diffDays === 1) {
        return colors.cyan(this.i18n.t("format.date.yesterday"));
      } else if (diffDays < 7) {
        return colors.cyan(this.i18n.t("format.date.daysAgo", { n: diffDays }));
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return colors.gray(this.i18n.t("format.date.weeksAgo", { n: weeks }));
      } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return colors.gray(this.i18n.t("format.date.monthsAgo", { n: months }));
      } else {
        const years = Math.floor(diffDays / 365);
        return colors.gray(this.i18n.t("format.date.yearsAgo", { n: years }));
      }
    } catch {
      return colors.gray(this.i18n.t("format.date.unknown"));
    }
  }

  /**
   * Format tags with color
   */
  formatTags(tags: string[]): string {
    return tags.map((t) => colors.blue(`#${t}`)).join(", ");
  }

  /**
   * Get numeric value for priority (for sorting)
   */
  getPriorityValue(priority: string): number {
    switch (priority) {
      case "high":
        return 3;
      case "normal":
        return 2;
      case "low":
        return 1;
      default:
        return 0;
    }
  }

  /**
   * Display a complete task with formatting
   */
  displayTask(
    task: TaskInfo,
    options?: {
      showBody?: boolean;
      showMetadata?: boolean;
      useRelativePath?: boolean;
      baseDir?: string;
    },
  ): Result<string, Error> {
    try {
      const showBody = options?.showBody ?? true;
      const showMetadata = options?.showMetadata ?? true;
      const output: string[] = [];

      // Add header separator
      output.push(colors.gray("─".repeat(60)));
      output.push("");

      // Task title
      output.push(colors.bold(colors.cyan(`📋 ${task.title}`)));
      output.push("");

      if (showMetadata) {
        // Metadata section
        output.push(colors.bold(this.i18n.t("display.metadata")));
        output.push(
          `  ${colors.gray(this.i18n.t("display.file") + ":")} ${task.fileName}`,
        );
        output.push(
          `  ${colors.gray(this.i18n.t("display.status") + ":")} ${this.formatStatus(task.status)}`,
        );
        output.push(
          `  ${colors.gray(this.i18n.t("display.priority") + ":")} ${
            this.formatPriority(task.priority || "normal")
          }`,
        );

        if (task.tags && task.tags.length > 0) {
          output.push(
            `  ${colors.gray(this.i18n.t("display.tags", { tags: "" }).replace(": ", ":"))} ${
              this.formatTags(task.tags)
            }`,
          );
        }

        output.push(
          `  ${colors.gray(this.i18n.t("display.created", { date: "" }).replace(": ", ":"))} ${
            this.formatDate(task.created)
          }`,
        );

        if (task.frontmatter.updated && typeof task.frontmatter.updated === "string") {
          output.push(
            `  ${colors.gray(this.i18n.t("display.updated", { date: "" }).replace(": ", ":"))} ${
              this.formatDate(task.frontmatter.updated)
            }`,
          );
        }

        if (task.frontmatter.due && typeof task.frontmatter.due === "string") {
          output.push(
            `  ${colors.gray(this.i18n.t("display.due", { date: "" }).replace(": ", ":"))} ${
              this.formatDate(task.frontmatter.due)
            }`,
          );
        }

        // Repository info
        if (task.repository) {
          output.push(
            `  ${colors.gray(this.i18n.t("display.repository", { repo: "" }).replace(": ", ":"))} ${
              colors.blue(task.repository)
            }`,
          );
        }

        // Custom frontmatter fields
        const knownFields = ["date", "created", "updated", "due", "tags", "status", "priority"];
        const customFields = Object.entries(task.frontmatter)
          .filter(([key]) => !knownFields.includes(key));

        if (customFields.length > 0) {
          output.push("");
          output.push(colors.bold(this.i18n.t("display.customFields")));
          for (const [key, value] of customFields) {
            output.push(
              `  ${colors.gray(key + ":")} ${this.formatValue(value)}`,
            );
          }
        }
      }

      if (showBody) {
        // Body section
        output.push("");
        output.push(colors.gray("─".repeat(60)));
        output.push("");

        if (task.body.trim()) {
          // Render markdown body
          const renderedBody = this.renderMarkdownBody(task.body);
          output.push(renderedBody);
        } else {
          output.push(colors.gray(this.i18n.t("display.noContent")));
        }
      }

      output.push("");
      output.push(colors.gray("─".repeat(60)));

      return ok(output.join("\n"));
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Render markdown body with terminal formatting
   */
  renderMarkdownBody(body: string): string {
    return this.formatMarkdownBasic(body);
  }

  /**
   * Basic markdown formatting
   */
  formatMarkdownBasic(markdown: string): string {
    const lines = markdown.split("\n");
    const formatted: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Headers
      if (trimmed.startsWith("# ")) {
        const text = trimmed.substring(2);
        formatted.push(colors.bold(colors.blue(text)));
      } else if (trimmed.startsWith("## ")) {
        const text = trimmed.substring(3);
        formatted.push(colors.bold(colors.cyan(text)));
      } else if (trimmed.startsWith("### ")) {
        const text = trimmed.substring(4);
        formatted.push(colors.bold(colors.green(text)));
      } // Lists
      else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const text = trimmed.substring(2);
        formatted.push(`  ${colors.yellow("•")} ${text}`);
      } // Numbered lists
      else if (/^\d+\.\s/.test(trimmed)) {
        formatted.push(`  ${line}`);
      } // Code blocks
      else if (trimmed.startsWith("```")) {
        formatted.push(colors.gray(line));
      } // Blockquotes
      else if (trimmed.startsWith("> ")) {
        const text = trimmed.substring(2);
        formatted.push(colors.gray(`  │ ${text}`));
      } // Regular text
      else {
        formatted.push(line);
      }
    }

    return formatted.join("\n");
  }

  /**
   * Format a value for display
   */
  private formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return colors.gray("null");
    }

    if (typeof value === "boolean") {
      return value ? colors.green("true") : colors.red("false");
    }

    if (typeof value === "number") {
      return colors.yellow(String(value));
    }

    if (Array.isArray(value)) {
      return `[${value.map((v) => colors.cyan(String(v))).join(", ")}]`;
    }

    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    return String(value);
  }
}
