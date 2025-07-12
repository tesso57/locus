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
  const noColor = options.noColor ?? false;

  // Add header separator
  output.push(noColor ? "─".repeat(60) : colors.gray("─".repeat(60)));
  output.push("");

  // Task title
  output.push(noColor ? `📋 ${task.title}` : colors.bold(colors.cyan(`📋 ${task.title}`)));
  output.push("");

  // Metadata section
  output.push(noColor ? "📌 メタデータ:" : colors.bold("📌 メタデータ:"));
  output.push(noColor ? `  ファイル: ${task.fileName}` : `  ${colors.gray("ファイル:")} ${task.fileName}`);
  output.push(noColor ? `  ステータス: ${formatStatusPlain(task.status)}` : `  ${colors.gray("ステータス:")} ${formatStatus(task.status)}`);
  output.push(noColor ? `  優先度: ${formatPriorityPlain(task.priority)}` : `  ${colors.gray("優先度:")} ${formatPriority(task.priority)}`);

  if (task.tags && task.tags.length > 0) {
    output.push(noColor ? `  タグ: ${task.tags.map(t => `#${t}`).join(", ")}` : `  ${colors.gray("タグ:")} ${formatTags(task.tags)}`);
  }

  output.push(noColor ? `  作成日: ${formatDatePlain(task.created)}` : `  ${colors.gray("作成日:")} ${formatDate(task.created)}`);

  if (task.frontmatter.updated && typeof task.frontmatter.updated === "string") {
    output.push(noColor ? `  更新日: ${formatDatePlain(task.frontmatter.updated)}` : `  ${colors.gray("更新日:")} ${formatDate(task.frontmatter.updated)}`);
  }

  if (task.frontmatter.due && typeof task.frontmatter.due === "string") {
    output.push(noColor ? `  期限: ${formatDatePlain(task.frontmatter.due)}` : `  ${colors.gray("期限:")} ${formatDate(task.frontmatter.due)}`);
  }

  // Repository info
  if (options.repoInfo) {
    output.push(
      noColor
        ? `  リポジトリ: ${options.repoInfo.owner}/${options.repoInfo.repo}`
        : `  ${colors.gray("リポジトリ:")} ${
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
    output.push(noColor ? "🔧 カスタムフィールド:" : colors.bold("🔧 カスタムフィールド:"));
    for (const [key, value] of customFields) {
      output.push(noColor ? `  ${key}: ${formatValuePlain(value)}` : `  ${colors.gray(key + ":")} ${formatValue(value)}`);
    }
  }

  // Body section
  output.push("");
  output.push(noColor ? "─".repeat(60) : colors.gray("─".repeat(60)));
  output.push("");

  if (task.body.trim()) {
    // Render markdown body
    const renderedBody = await renderMarkdownBody(task.body, noColor);
    output.push(renderedBody);
  } else {
    output.push(noColor ? "（本文なし）" : colors.gray("（本文なし）"));
  }

  output.push("");
  output.push(noColor ? "─".repeat(60) : colors.gray("─".repeat(60)));

  return output.join("\n");
}

/**
 * Render markdown body with terminal formatting
 */
async function renderMarkdownBody(markdown: string, noColor: boolean = false): Promise<string> {
  // If no color is requested, use basic formatting instead of charmd
  if (noColor) {
    return formatMarkdownBasic(markdown, noColor);
  }
  
  try {
    // Use charMD to render markdown for terminal
    const rendered = await renderMarkdown(markdown);
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
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

/**
 * Format status without color
 */
function formatStatusPlain(status: string): string {
  switch (status) {
    case "todo":
      return "⏳ TODO";
    case "in_progress":
      return "🔄 進行中";
    case "done":
      return "✅ 完了";
    case "cancelled":
      return "❌ キャンセル";
    default:
      return status;
  }
}

/**
 * Format priority without color
 */
function formatPriorityPlain(priority?: string): string {
  switch (priority) {
    case "high":
      return "🔴 高";
    case "normal":
      return "🟡 中";
    case "low":
      return "🟢 低";
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
function formatDatePlain(dateStr: string): string {
  if (!dateStr) return "不明";

  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "今日";
    } else if (diffDays === 1) {
      return "昨日";
    } else if (diffDays < 7) {
      return `${diffDays}日前`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks}週間前`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months}ヶ月前`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years}年前`;
    }
  } catch {
    return "不明";
  }
}
