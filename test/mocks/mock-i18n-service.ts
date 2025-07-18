import { I18nService } from "../../src/services/i18n.ts";
import { err, ok, Result } from "../../src/utils/result.ts";

/**
 * Mock I18nService for testing
 */
export class MockI18nService implements I18nService {
  private language = "ja";
  private defaultMessages: Record<string, string> = {
    "path.messages.fileNotFound": "タスクファイルが見つかりません",
    "path.messages.taskFileNotFound": "タスクファイルが見つかりません：{filename}",
    "path.errors.notFound": "タスクファイルが見つかりません: {filename}",
    "path.errors.hint": "--no-gitオプションを使用してください",
    "display.metadata": "メタデータ",
    "display.file": "ファイル",
    "display.status": "ステータス",
    "display.priority": "優先度",
    "display.tags": "タグ: {tags}",
    "display.created": "作成日: {date}",
    "display.content": "内容",
    "display.noContent": "（本文なし）",
    "display.noBody": "（本文なし）",
    "display.customFields": "🔧 カスタムフィールド:",
    "errors.filename.pathSeparator": "ファイル名にパス区切り文字（/や\\）を含めることはできません",
    "errors.filename.relativePath": "ファイル名に相対パス（..）を含めることはできません",
    "errors.filename.empty": "ファイル名が空です",
    "errors.filename.tooLong": "ファイル名が長すぎます（最大255文字）",
    "errors.filename.invalidChars": "ファイル名に無効な文字が含まれています",
  };

  /**
   * Override t method to return the key as is for testing
   */
  t(key: string, params?: Record<string, unknown>): string {
    // Try to get from default messages first
    let message = this.defaultMessages[key] || key;

    // Return the message with params interpolated if provided
    if (params) {
      for (const [paramKey, value] of Object.entries(params)) {
        message = message.replace(`{${paramKey}}`, String(value));
      }
    }
    return message;
  }

  setLanguage(lang: string): Result<void, Error> {
    this.language = lang;
    return ok(undefined);
  }

  getCurrentLanguage(): string {
    return this.language;
  }

  getSupportedLanguages(): string[] {
    return ["ja", "en"];
  }

  /**
   * Create a mock I18nService with predefined messages
   */
  static createWithMessages(messages: Record<string, string>): MockI18nService {
    const service = new MockI18nService();
    // Merge provided messages with default messages
    service.defaultMessages = { ...service.defaultMessages, ...messages };
    return service;
  }
}
