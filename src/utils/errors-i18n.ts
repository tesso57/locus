import { I18nService } from "../services/i18n.ts";
import { getErrorMessage as getOriginalErrorMessage } from "./errors.ts";

/**
 * Log error message with i18n support
 */
export function logError(message: string, i18n: I18nService): void {
  console.error(i18n.t("common.error.prefix") + message);
}

/**
 * Format error with i18n support
 */
export function formatError(error: unknown, i18n: I18nService): string {
  const message = getOriginalErrorMessage(error);
  return i18n.t("common.error.prefix") + message;
}

/**
 * Get error message with i18n support
 */
export function getErrorMessage(error: unknown, i18n: I18nService): string {
  return getOriginalErrorMessage(error);
}
