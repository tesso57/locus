import { colors } from "@cliffy/ansi/colors";
import { I18nService } from "../services/i18n.ts";

/**
 * Format task status with color and icon (i18n version)
 */
export function formatStatus(status: string, i18n: I18nService): string {
  switch (status) {
    case "todo":
      return colors.yellow(i18n.t("format.status.todo"));
    case "in_progress":
      return colors.blue(i18n.t("format.status.inProgress"));
    case "done":
      return colors.green(i18n.t("format.status.done"));
    case "cancelled":
      return colors.gray(i18n.t("format.status.cancelled"));
    default:
      return status;
  }
}

/**
 * Format task priority with color and icon (i18n version)
 */
export function formatPriority(priority: string, i18n: I18nService): string {
  switch (priority) {
    case "high":
      return colors.red(i18n.t("format.priority.high"));
    case "normal":
      return colors.yellow(i18n.t("format.priority.medium"));
    case "low":
      return colors.green(i18n.t("format.priority.low"));
    default:
      return priority;
  }
}

/**
 * Format date relative to current time (i18n version)
 */
export function formatDate(dateStr: string, i18n: I18nService): string {
  if (!dateStr) return colors.gray(i18n.t("format.date.unknown"));

  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return colors.green(i18n.t("format.date.today"));
    } else if (diffDays === 1) {
      return colors.cyan(i18n.t("format.date.yesterday"));
    } else if (diffDays < 7) {
      return colors.cyan(i18n.t("format.date.daysAgo", { n: diffDays }));
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return colors.gray(i18n.t("format.date.weeksAgo", { n: weeks }));
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return colors.gray(i18n.t("format.date.monthsAgo", { n: months }));
    } else {
      const years = Math.floor(diffDays / 365);
      return colors.gray(i18n.t("format.date.yearsAgo", { n: years }));
    }
  } catch {
    return colors.gray(i18n.t("format.date.unknown"));
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
 * Format tags with color (same as original, no i18n needed)
 */
export function formatTags(tags: string[]): string {
  return tags.map((t) => colors.blue(`#${t}`)).join(", ");
}
