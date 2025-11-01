/**
 * i18n Manager
 * Internationalization and localization management
 */

interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  flag: string;
}

interface TranslationKey {
  [key: string]: string | TranslationKey;
}

type Locale = Record<string, any>;

class I18nManager {
  private static instance: I18nManager;
  private currentLanguage: string = this.detectLanguage();
  private locales: Map<string, Locale> = new Map();
  private supportedLanguages: Map<string, LanguageConfig> = new Map();
  private fallbackLanguage: string = 'en';
  private pluralRules: Intl.PluralRules | null = null;
  private dateFormatter: Intl.DateTimeFormat | null = null;
  private numberFormatter: Intl.NumberFormat | null = null;

  private constructor() {
    this.initializeSupportedLanguages();
    this.updateFormatters();
  }

  static getInstance(): I18nManager {
    if (!I18nManager.instance) {
      I18nManager.instance = new I18nManager();
    }
    return I18nManager.instance;
  }

  /**
   * Initialize supported languages
   */
  private initializeSupportedLanguages(): void {
    const languages: LanguageConfig[] = [
      { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr', flag: '🇪🇸' },
      { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr', flag: '🇺🇸' },
      { code: 'fr', name: 'French', nativeName: 'Français', direction: 'ltr', flag: '🇫🇷' },
      { code: 'de', name: 'German', nativeName: 'Deutsch', direction: 'ltr', flag: '🇩🇪' },
      { code: 'it', name: 'Italian', nativeName: 'Italiano', direction: 'ltr', flag: '🇮🇹' },
      { code: 'pt', name: 'Portuguese', nativeName: 'Português', direction: 'ltr', flag: '🇵🇹' },
      { code: 'ja', name: 'Japanese', nativeName: '日本語', direction: 'ltr', flag: '🇯🇵' },
      { code: 'zh', name: 'Chinese', nativeName: '中文', direction: 'ltr', flag: '🇨🇳' },
      { code: 'ru', name: 'Russian', nativeName: 'Русский', direction: 'ltr', flag: '🇷🇺' },
      { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl', flag: '🇸🇦' },
    ];

    languages.forEach(lang => {
      this.supportedLanguages.set(lang.code, lang);
    });
  }

  /**
   * Detect user's language
   */
  private detectLanguage(): string {
    // Check localStorage first
    const saved = localStorage.getItem('i18n_language');
    if (saved) return saved;

    // Check browser language
    const browserLang = navigator.language.split('-')[0];
    if (this.supportedLanguages.has(browserLang)) {
      return browserLang;
    }

    return 'en';
  }

  /**
   * Load locale
   */
  loadLocale(languageCode: string, locale: Locale): void {
    this.locales.set(languageCode, locale);
  }

  /**
   * Set current language
   */
  setLanguage(languageCode: string): void {
    if (!this.supportedLanguages.has(languageCode)) {
      console.warn(`Language ${languageCode} not supported`);
      return;
    }

    this.currentLanguage = languageCode;
    localStorage.setItem('i18n_language', languageCode);
    this.updateFormatters();

    // Update document direction
    const config = this.supportedLanguages.get(languageCode);
    if (config) {
      document.documentElement.dir = config.direction;
      document.documentElement.lang = languageCode;
    }

    // Dispatch change event
    window.dispatchEvent(new CustomEvent('i18n:languageChanged', { detail: { language: languageCode } }));
  }

  /**
   * Get current language
   */
  getLanguage(): string {
    return this.currentLanguage;
  }

  /**
   * Get language name
   */
  getLanguageName(languageCode?: string): string {
    const code = languageCode || this.currentLanguage;
    return this.supportedLanguages.get(code)?.name || code;
  }

  /**
   * Get language native name
   */
  getNativeName(languageCode?: string): string {
    const code = languageCode || this.currentLanguage;
    return this.supportedLanguages.get(code)?.nativeName || code;
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): LanguageConfig[] {
    return Array.from(this.supportedLanguages.values());
  }

  /**
   * Translate key
   */
  t(key: string, defaultValue?: string, interpolation?: Record<string, any>): string {
    const locale = this.locales.get(this.currentLanguage) || this.locales.get(this.fallbackLanguage) || {};
    const value = this.getNestedValue(locale, key);

    if (!value && defaultValue) {
      return defaultValue;
    }

    if (typeof value !== 'string') {
      return defaultValue || key;
    }

    if (interpolation) {
      return this.interpolate(value, interpolation);
    }

    return value;
  }

  /**
   * Translate with pluralization
   */
  tn(key: string, count: number, defaultValue?: string): string {
    const locale = this.locales.get(this.currentLanguage) || this.locales.get(this.fallbackLanguage) || {};
    const value = this.getNestedValue(locale, key);

    if (typeof value !== 'object' || value === null) {
      return defaultValue || key;
    }

    const pluralForm = this.getPluralForm(count);
    return (value as any)[pluralForm] || defaultValue || key;
  }

  /**
   * Format date
   */
  formatDate(date: Date | number, format?: 'short' | 'long' | 'full'): string {
    if (!this.dateFormatter) {
      return new Date(date).toLocaleDateString();
    }

    let options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    };

    if (format === 'long') {
      options = { year: 'numeric', month: 'long', day: 'numeric' };
    } else if (format === 'full') {
      options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    }

    return new Intl.DateTimeFormat(this.currentLanguage, options).format(new Date(date));
  }

  /**
   * Format time
   */
  formatTime(date: Date | number): string {
    return new Intl.DateTimeFormat(this.currentLanguage, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(date));
  }

  /**
   * Format number
   */
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this.currentLanguage, options).format(value);
  }

  /**
   * Format currency
   */
  formatCurrency(value: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat(this.currentLanguage, {
      style: 'currency',
      currency,
    }).format(value);
  }

  /**
   * Get plural form
   */
  private getPluralForm(count: number): string {
    if (!this.pluralRules) {
      this.pluralRules = new Intl.PluralRules(this.currentLanguage);
    }
    return this.pluralRules.select(count);
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, key: string): any {
    return key.split('.').reduce((current, part) => current?.[part], obj);
  }

  /**
   * Interpolate variables in string
   */
  private interpolate(str: string, vars: Record<string, any>): string {
    return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return vars[key] !== undefined ? String(vars[key]) : match;
    });
  }

  /**
   * Update formatters
   */
  private updateFormatters(): void {
    this.pluralRules = new Intl.PluralRules(this.currentLanguage);
    this.dateFormatter = new Intl.DateTimeFormat(this.currentLanguage);
    this.numberFormatter = new Intl.NumberFormat(this.currentLanguage);
  }

  /**
   * Get language direction
   */
  getDirection(): 'ltr' | 'rtl' {
    return this.supportedLanguages.get(this.currentLanguage)?.direction || 'ltr';
  }

  /**
   * Check if RTL language
   */
  isRTL(): boolean {
    return this.getDirection() === 'rtl';
  }
}

export default I18nManager;
export type { LanguageConfig, Locale };