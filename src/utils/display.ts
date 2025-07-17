import { colors } from "@cliffy/ansi/colors";
import { TaskInfo } from "../services/task-service.ts";
import { RepoInfo } from "../types.ts";
import { formatDate, formatPriority, formatStatus, formatTags } from "./format-i18n.ts";
import { I18nService } from "../services/i18n.ts";

interface DisplayOptions {
  noColor?: boolean;
  repoInfo?: RepoInfo | null;
}

/**
 * Display a task with formatted output
 */
export function displayTask(
  task: TaskInfo,
  options: DisplayOptions = {},
  i18n: I18nService,
): string {
  const output: string[] = [];
  const noColor = options.noColor ?? false;

  // Add header separator
  output.push(noColor ? "─".repeat(60) : colors.gray("─".repeat(60)));
  output.push("");

  // Task title
  output.push(noColor ? `📋 ${task.title}` : colors.bold(colors.cyan(`📋 ${task.title}`)));
  output.push("");

  // Metadata section
  output.push(noColor ? i18n.t("display.metadata") : colors.bold(i18n.t("display.metadata")));
  output.push(
    noColor
      ? `  ${i18n.t("display.file")}: ${task.fileName}`
      : `  ${colors.gray(i18n.t("display.file") + ":")} ${task.fileName}`,
  );
  output.push(
    noColor
      ? `  ${i18n.t("display.status")}: ${formatStatusPlain(task.status, i18n)}`
      : `  ${colors.gray(i18n.t("display.status") + ":")} ${formatStatus(task.status, i18n)}`,
  );
  output.push(
    noColor
      ? `  ${i18n.t("display.priority")}: ${formatPriorityPlain(task.priority || "normal", i18n)}`
      : `  ${colors.gray(i18n.t("display.priority") + ":")} ${
        formatPriority(task.priority || "normal", i18n)
      }`,
  );

  if (task.tags && task.tags.length > 0) {
    output.push(
      noColor
        ? `  ${i18n.t("display.tags", { tags: task.tags.map((t: string) => `#${t}`).join(", ") })}`
        : `  ${colors.gray(i18n.t("display.tags", { tags: "" }).replace(": ", ":"))} ${
          formatTags(task.tags)
        }`,
    );
  }

  output.push(
    noColor
      ? `  ${i18n.t("display.created", { date: formatDatePlain(task.created, i18n) })}`
      : `  ${colors.gray(i18n.t("display.created", { date: "" }).replace(": ", ":"))} ${
        formatDate(task.created, i18n)
      }`,
  );

  if (task.frontmatter.updated && typeof task.frontmatter.updated === "string") {
    output.push(
      noColor
        ? `  ${
          i18n.t("display.updated", { date: formatDatePlain(task.frontmatter.updated, i18n) })
        }`
        : `  ${colors.gray(i18n.t("display.updated", { date: "" }).replace(": ", ":"))} ${
          formatDate(task.frontmatter.updated, i18n)
        }`,
    );
  }

  if (task.frontmatter.due && typeof task.frontmatter.due === "string") {
    output.push(
      noColor
        ? `  ${i18n.t("display.due", { date: formatDatePlain(task.frontmatter.due, i18n) })}`
        : `  ${colors.gray(i18n.t("display.due", { date: "" }).replace(": ", ":"))} ${
          formatDate(task.frontmatter.due, i18n)
        }`,
    );
  }

  // Repository info
  if (options.repoInfo) {
    output.push(
      noColor
        ? `  ${
          i18n.t("display.repository", {
            repo: `${options.repoInfo.owner}/${options.repoInfo.repo}`,
          })
        }`
        : `  ${colors.gray(i18n.t("display.repository", { repo: "" }).replace(": ", ":"))} ${
          colors.blue(`${options.repoInfo.owner}/${options.repoInfo.repo}`)
        }`,
    );
  }

  // Custom frontmatter fields
  const knownFields = ["date", "created", "updated", "due", "tags", "status", "priority"];
  const customFields = Object.entries(task.frontmatter)
    .filter(([key]) => !knownFields.includes(key));

  if (customFields.length > 0) {
    output.push("");
    output.push(
      noColor ? i18n.t("display.customFields") : colors.bold(i18n.t("display.customFields")),
    );
    for (const [key, value] of customFields) {
      output.push(
        noColor
          ? `  ${key}: ${formatValuePlain(value)}`
          : `  ${colors.gray(key + ":")} ${formatValue(value)}`,
      );
    }
  }

  // Body section
  output.push("");
  output.push(noColor ? "─".repeat(60) : colors.gray("─".repeat(60)));
  output.push("");

  if (task.body.trim()) {
    // Render markdown body
    const renderedBody = renderMarkdownBody(task.body, noColor);
    output.push(renderedBody);
  } else {
    output.push(noColor ? i18n.t("display.noContent") : colors.gray(i18n.t("display.noContent")));
  }

  output.push("");
  output.push(noColor ? "─".repeat(60) : colors.gray("─".repeat(60)));

  return output.join("\n");
}

/**
 * Render markdown body with terminal formatting
 */
function renderMarkdownBody(markdown: string, noColor: boolean = false): string {
  // Always use basic formatting
  return formatMarkdownBasic(markdown, noColor);
}

/**
 * Basic markdown formatting without external library
 */
function formatMarkdownBasic(markdown: string, noColor: boolean = false): string {
  const lines = markdown.split("\n");
  const formatted: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Headers
    if (trimmed.startsWith("# ")) {
      const text = trimmed.substring(2);
      formatted.push(noColor ? text : colors.bold(colors.blue(text)));
    } else if (trimmed.startsWith("## ")) {
      const text = trimmed.substring(3);
      formatted.push(noColor ? text : colors.bold(colors.cyan(text)));
    } else if (trimmed.startsWith("### ")) {
      const text = trimmed.substring(4);
      formatted.push(noColor ? text : colors.bold(colors.green(text)));
    } // Lists
    else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const text = trimmed.substring(2);
      formatted.push(noColor ? `  • ${text}` : `  ${colors.yellow("•")} ${text}`);
    } // Numbered lists
    else if (/^\d+\.\s/.test(trimmed)) {
      formatted.push(noColor ? `  ${line}` : `  ${line}`);
    } // Code blocks
    else if (trimmed.startsWith("```")) {
      formatted.push(noColor ? line : colors.gray(line));
    } // Blockquotes
    else if (trimmed.startsWith("> ")) {
      const text = trimmed.substring(2);
      formatted.push(noColor ? `  │ ${text}` : colors.gray(`  │ ${text}`));
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
function formatValue(value: unknown): string {
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

/**
 * Strip ANSI escape codes from a string
 */
function stripAnsi(str: string): string {
  // deno-lint-ignore no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

/**
 * Format status without color
 */
function formatStatusPlain(status: string, i18n: I18nService): string {
  switch (status) {
    case "todo":
      return stripAnsi(i18n.t("format.status.todo"));
    case "in_progress":
      return stripAnsi(i18n.t("format.status.inProgress"));
    case "done":
      return stripAnsi(i18n.t("format.status.done"));
    case "cancelled":
      return stripAnsi(i18n.t("format.status.cancelled"));
    default:
      return status;
  }
}

/**
 * Format priority without color
 */
function formatPriorityPlain(priority: string | undefined, i18n: I18nService): string {
  switch (priority) {
    case "high":
      return stripAnsi(i18n.t("format.priority.high"));
    case "normal":
      return stripAnsi(i18n.t("format.priority.medium"));
    case "low":
      return stripAnsi(i18n.t("format.priority.low"));
    default:
      return priority || "medium";
  }
}

/**
 * Format value without color
 */
function formatValuePlain(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }

  if (typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(String).join(", ")}]`;
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * Format date without color
 */
function formatDatePlain(dateStr: string, i18n: I18nService): string {
  if (!dateStr) return i18n.t("format.date.unknown");

  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return i18n.t("format.date.today");
    } else if (diffDays === 1) {
      return i18n.t("format.date.yesterday");
    } else if (diffDays < 7) {
      return i18n.t("format.date.daysAgo", { n: diffDays });
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return i18n.t("format.date.weeksAgo", { n: weeks });
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return i18n.t("format.date.monthsAgo", { n: months });
    } else {
      const years = Math.floor(diffDays / 365);
      return i18n.t("format.date.yearsAgo", { n: years });
    }
  } catch {
    return i18n.t("format.date.unknown");
  }
}
