import { err, ok, Result } from "../utils/result.ts";
import { messages as embeddedMessages } from "../i18n/messages.ts";

/**
 * Service interface for internationalization (i18n) functionality.
 *
 * Provides methods for translating text, managing languages, and retrieving
 * language information. Implementations should support multiple languages
 * and provide fallback mechanisms for missing translations.
 *
 * @since 0.1.0
 */
export interface I18nService {
  /**
   * Translates a message key to the current language.
   *
   * @param key - The translation key in dot notation (e.g., "commands.add.success")
   * @param params - Optional parameters for interpolation in the translated string
   * @param defaultValue - Optional default value if translation is not found
   * @returns The translated string with parameters interpolated
   *
   * @example
   * ```typescript
   * // Simple translation
   * const message = i18n.t("commands.add.success");
   *
   * // Translation with parameters
   * const greeting = i18n.t("common.greeting", { name: "Alice" });
   * // Returns: "Hello, Alice!" (if translation is "Hello, {{name}}!")
   * ```
   */
  t(key: string, params?: Record<string, unknown>, defaultValue?: string): string;

  /**
   * Changes the current language.
   *
   * @param lang - The language code to switch to (e.g., "en", "ja")
   * @returns Result indicating success or failure with error details
   */
  setLanguage(lang: string): Result<void, Error>;

  /**
   * Gets the currently active language code.
   *
   * @returns The current language code (e.g., "en", "ja")
   */
  getCurrentLanguage(): string;

  /**
   * Gets the list of supported language codes.
   *
   * @returns Array of supported language codes
   */
  getSupportedLanguages(): string[];
}

/**
 * Internal type for nested message structure.
 * Messages can be either strings or nested objects for hierarchical organization.
 */
interface Messages {
  [key: string]: string | Messages;
}

/**
 * Default implementation of the I18nService interface.
 *
 * This implementation:
 * - Loads translations from embedded message files
 * - Supports Japanese (ja) and English (en) languages
 * - Falls back to Japanese if language detection fails
 * - Provides simple template interpolation with {{parameter}} syntax
 *
 * @example
 * ```typescript
 * const i18n = new I18n("en");
 * const result = i18n.initialize();
 * if (result.ok) {
 *   console.log(i18n.t("welcome.message"));
 * }
 * ```
 */
export class I18n implements I18nService {
  private messages: Messages = {};
  private currentLang: string;
  private readonly supportedLangs = ["ja", "en"];
  private readonly fallbackLang = "en";

  /**
   * Creates a new I18n instance.
   *
   * @param initialLang - Optional initial language code. If not provided, language is auto-detected.
   */
  constructor(initialLang?: string) {
    this.currentLang = this.validateLanguage(initialLang || this.detectLanguage());
  }

  /**
   * Initializes the I18n service by loading message files.
   * Must be called before using translation functions.
   *
   * @returns Result indicating success or failure with error details
   */
  initialize(): Result<void, Error> {
    const result = this.loadMessages(this.currentLang);
    if (!result.ok) {
      // Try fallback language
      const fallbackResult = this.loadMessages(this.fallbackLang);
      if (!fallbackResult.ok) {
        return err(new Error(`Failed to load messages for any language`));
      }
      this.currentLang = this.fallbackLang;
      this.messages = fallbackResult.value;
    } else {
      this.messages = result.value;
    }
    return ok(undefined);
  }

  t(key: string, params?: Record<string, unknown>, defaultValue?: string): string {
    const value = this.getNestedValue(this.messages, key);

    if (typeof value !== "string") {
      return defaultValue ?? key; // Return default or key if translation not found
    }

    // Simple parameter interpolation
    if (params) {
      return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
        return String(params[paramKey] ?? match);
      });
    }

    return value;
  }

  setLanguage(lang: string): Result<void, Error> {
    const validatedLang = this.validateLanguage(lang);
    if (validatedLang === this.currentLang) {
      return ok(undefined);
    }

    const result = this.loadMessages(validatedLang);
    if (!result.ok) {
      return result;
    }

    this.currentLang = validatedLang;
    this.messages = result.value;
    return ok(undefined);
  }

  getCurrentLanguage(): string {
    return this.currentLang;
  }

  getSupportedLanguages(): string[] {
    return [...this.supportedLangs];
  }

  private loadMessages(lang: string): Result<Messages, Error> {
    try {
      // Use embedded messages
      const messages = embeddedMessages[lang as keyof typeof embeddedMessages];
      if (!messages) {
        return err(new Error(`Language '${lang}' not found`));
      }
      return ok(messages as Messages);
    } catch (error) {
      return err(new Error(`Failed to load messages for language '${lang}': ${error}`));
    }
  }

  private getNestedValue(obj: Messages, path: string): string | Messages | undefined {
    const keys = path.split(".");
    let current: Messages | string | undefined = obj;

    for (const key of keys) {
      if (typeof current !== "object" || current === null) {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }

  private validateLanguage(lang: string): string {
    const normalized = lang.toLowerCase().split(/[-_]/)[0]; // ja_JP -> ja
    return this.supportedLangs.includes(normalized) ? normalized : this.fallbackLang;
  }

  private detectLanguage(): string {
    // Check environment variables
    const envLang = Deno.env.get("LANG") || Deno.env.get("LC_ALL") || "";
    if (envLang) {
      const lang = envLang.split(".")[0].split("_")[0].toLowerCase();
      if (this.supportedLangs.includes(lang)) {
        return lang;
      }
    }

    // Default to Japanese
    return this.fallbackLang;
  }
}

// Factory function for creating and initializing i18n service
/**
 * Factory function to create and initialize an I18nService instance.
 *
 * @param lang - Optional language code to use. If not provided, language is auto-detected
 *               from environment variables or system settings.
 * @returns Result containing the initialized I18nService or an error
 *
 * @example
 * ```typescript
 * // Create with auto-detected language
 * const i18nResult = createI18n();
 * if (i18nResult.ok) {
 *   const message = i18nResult.value.t("welcome");
 * }
 *
 * // Create with specific language
 * const i18nResult = createI18n("en");
 * if (i18nResult.ok) {
 *   console.log(i18nResult.value.getCurrentLanguage()); // "en"
 * }
 * ```
 */
export function createI18n(lang?: string): Result<I18nService, Error> {
  const i18n = new I18n(lang);
  const result = i18n.initialize();

  if (!result.ok) {
    return err(result.error);
  }

  return ok(i18n);
}
