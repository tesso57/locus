import { I18nService } from "../services/i18n.ts";

export type I18nError = {
  key: string;
  params?: Record<string, unknown>;
};

export function formatError(error: I18nError | Error | string, i18n: I18nService): string {
  if (typeof error === "string") {
    return error;
  }

  if ("key" in error) {
    // I18n error
    return i18n.t(`common.error.prefix`) + i18n.t(error.key, error.params);
  }

  // Regular Error object
  return i18n.t(`common.error.prefix`) + error.message;
}

export function createI18nError(key: string, params?: Record<string, unknown>): I18nError {
  return { key, params };
}
