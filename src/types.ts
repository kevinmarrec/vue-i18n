import type { FunctionPlugin } from 'vue'

export type LocaleMessageValue = LocaleMessageDictionary | string

export interface LocaleMessageDictionary {
  [key: string]: LocaleMessageValue
}

export interface LocaleMessages {
  [locale: string]: LocaleMessageDictionary
}

type LocaleMessageLoader = () => Promise<unknown>

interface LazyLocaleMessages {
  [localePath: string]: LocaleMessageLoader
}

export type ResolvedLocaleMessages = Record<string, LocaleMessageDictionary | LocaleMessageLoader>

export interface DefineI18nOptions {
  /**
   * Locale served without an URL prefix, also used as fallback locale.
   * @default 'en'
   */
  defaultLocale?: string
  messages?: LocaleMessages | LazyLocaleMessages
}

export interface ResolvedOptions {
  locale: string
  fallbackLocale: string
  messages: ResolvedLocaleMessages
}

export interface I18n {
  /** Locales derived from `messages` keys. */
  locales: string[]
  defaultLocale: string
  /** `/fr/foo` → `{ locale: 'fr', pathname: '/foo' }`. Inverse of {@link I18n.localizePath}. */
  extractLocale: (pathname: string) => { locale: string, pathname: string }
  /** `('/foo', 'fr')` → `/fr/foo`. The default locale stays unprefixed. */
  localizePath: (pathname: string, locale: string) => string
  /**
   * Locale matching `navigator.language`, or {@link I18n.defaultLocale}.
   *
   * Browser-only. Safe as an `install()` input in a client-rendered app, but never in a
   * prerendered or server-rendered one: the server cannot reach the same answer, so the first
   * client render would disagree with the served HTML. Use it to decide a *navigation* instead.
   */
  detectLocale: () => string
  install: (locale: string) => Promise<FunctionPlugin>
}
