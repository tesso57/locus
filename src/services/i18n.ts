import { err, ok, Result } from "../utils/result.ts";
import { messages as embeddedMessages } from "../i18n/messages.ts";

export interface I18nService {
  t(key: string, params?: Record<string, unknown>, defaultValue?: string): string;
  setLanguage(lang: string): Result<void, Error>;
  getCurrentLanguage(): string;
  getSupportedLanguages(): string[];
}

interface Messages {
  [key: string]: string | Messages;
}

export class I18n implements I18nService {
  private messages: Messages = {};
  private currentLang: string;
  private readonly supportedLangs = ["ja", "en"];
  private readonly fallbackLang = "ja";

  constructor(initialLang?: string) {
    this.currentLang = this.validateLanguage(initialLang || this.detectLanguage());
  }

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
export function createI18n(lang?: string): Result<I18nService, Error> {
  const i18n = new I18n(lang);
  const result = i18n.initialize();

  if (!result.ok) {
    return err(result.error);
  }

  return ok(i18n);
}
