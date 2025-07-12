import { colors } from "@cliffy/ansi";
import { renderMarkdown } from "charmd";
import { TaskInfo } from "../services/task-service.ts";
import { RepoInfo } from "../types.ts";
import { formatDate, formatPriority, formatStatus, formatTags } from "./format.ts";

interface DisplayOptions {
  noColor?: boolean;
  repoInfo?: RepoInfo | null;
}

/**
 * Display a task with formatted output
 */
export async function displayTask(task: TaskInfo, options: DisplayOptions = {}): Promise<string> {
  const output: string[] = [];

  // If no color is requested, disable colors
  if (options.noColor) {
    colors.setColorEnabled(false);
  }

  // Add header separator
  output.push(colors.gray("─".repeat(60)));
  output.push("");

  // Task title
  output.push(colors.bold(colors.cyan(`📋 ${task.title}`)));
  output.push("");

  // Metadata section
  output.push(colors.bold("📌 メタデータ:"));
  output.push(`  ${colors.gray("ファイル:")} ${task.fileName}`);
  output.push(`  ${colors.gray("ステータス:")} ${formatStatus(task.status)}`);
  output.push(`  ${colors.gray("優先度:")} ${formatPriority(task.priority)}`);

  if (task.tags && task.tags.length > 0) {
    output.push(`  ${colors.gray("タグ:")} ${formatTags(task.tags)}`);
  }

  output.push(`  ${colors.gray("作成日:")} ${formatDate(task.created)}`);

  if (task.frontmatter.updated && typeof task.frontmatter.updated === "string") {
    output.push(`  ${colors.gray("更新日:")} ${formatDate(task.frontmatter.updated)}`);
  }

  if (task.frontmatter.due && typeof task.frontmatter.due === "string") {
    output.push(`  ${colors.gray("期限:")} ${formatDate(task.frontmatter.due)}`);
  }

  // Repository info
  if (options.repoInfo) {
    output.push(
      `  ${colors.gray("リポジトリ:")} ${
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
    output.push(colors.bold("🔧 カスタムフィールド:"));
    for (const [key, value] of customFields) {
      output.push(`  ${colors.gray(key + ":")} ${formatValue(value)}`);
    }
  }

  // Body section
  output.push("");
  output.push(colors.gray("─".repeat(60)));
  output.push("");

  if (task.body.trim()) {
    // Render markdown body
    const renderedBody = await renderMarkdownBody(task.body, options.noColor);
    output.push(renderedBody);
  } else {
    output.push(colors.gray("（本文なし）"));
  }

  output.push("");
  output.push(colors.gray("─".repeat(60)));

  // Re-enable colors if they were disabled
  if (options.noColor) {
    colors.setColorEnabled(true);
  }

  return output.join("\n");
}

/**
 * Render markdown body with terminal formatting
 */
async function renderMarkdownBody(markdown: string, noColor: boolean = false): Promise<string> {
  try {
    // Use charMD to render markdown for terminal
    const rendered = await renderMarkdown(markdown);

    // If no color is requested, strip ANSI codes
    if (noColor) {
      return stripAnsi(rendered);
    }

    return rendered;
  } catch (error: unknown) {
    // Fallback to basic formatting if charMD fails
    return formatMarkdownBasic(markdown, noColor);
  }
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
  return str.replace(/\x1B[[(?);]{0,2}(;?\d)*./g, "");
}
