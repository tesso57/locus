import { TaskInfo } from "./task-service.ts";
import { Result } from "../utils/result.ts";

/**
 * Service for formatting tasks and their components
 */
export interface FormatService {
  /**
   * Format task status with i18n support
   */
  formatStatus(status: string): string;

  /**
   * Format task priority with i18n support
   */
  formatPriority(priority: string): string;

  /**
   * Format date with i18n support and configurable format
   */
  formatDate(date: Date | string, format?: string): string;

  /**
   * Format tags array into a display string
   */
  formatTags(tags: string[]): string;

  /**
   * Get numeric value for priority (for sorting)
   */
  getPriorityValue(priority: string): number;

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
  ): Result<string, Error>;

  /**
   * Render markdown body with basic formatting
   */
  renderMarkdownBody(body: string): string;

  /**
   * Format markdown with basic styling
   */
  formatMarkdownBasic(text: string): string;
}
