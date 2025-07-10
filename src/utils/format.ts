import { colors } from "https://deno.land/x/cliffy@v1.0.0-rc.4/ansi/colors.ts";

/**
 * Format task status with color and icon
 */
export function formatStatus(status: string): string {
  switch (status) {
    case "todo":
      return colors.yellow("⏳ TODO");
    case "in_progress":
      return colors.blue("🔄 進行中");
    case "done":
      return colors.green("✅ 完了");
    case "cancelled":
      return colors.gray("❌ キャンセル");
    default:
      return status;
  }
}

/**
 * Format task priority with color and icon
 */
export function formatPriority(priority: string): string {
  switch (priority) {
    case "high":
      return colors.red("🔴 高");
    case "normal":
      return colors.yellow("🟡 中");
    case "low":
      return colors.green("🟢 低");
    default:
      return priority;
  }
}

/**
 * Get numeric value for priority (for sorting)
 */
export function priorityValue(priority: string): number {
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
 * Format date relative to current time
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return colors.gray("不明");

  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return colors.green("今日");
    } else if (diffDays === 1) {
      return colors.cyan("昨日");
    } else if (diffDays < 7) {
      return colors.cyan(`${diffDays}日前`);
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return colors.gray(`${weeks}週間前`);
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return colors.gray(`${months}ヶ月前`);
    } else {
      const years = Math.floor(diffDays / 365);
      return colors.gray(`${years}年前`);
    }
  } catch {
    return colors.gray("不明");
  }
}

/**
 * Format tags with color
 */
export function formatTags(tags: string[]): string {
  return tags.map((t) => colors.blue(`#${t}`)).join(", ");
}