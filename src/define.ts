import { injectionKey } from './constants'
import { createInstance } from './instance'
import type { DefineI18nOptions, I18n, ResolvedLocaleMessages } from './types'

const LOCALE_KEY_RE = /([\w-]+)\.(?:ya?ml|json)$/

function resolveMessages(input: DefineI18nOptions['messages'] = {}): ResolvedLocaleMessages {
  const output: ResolvedLocaleMessages = {}

  for (const key in input) {
    output[key.match(LOCALE_KEY_RE)?.[1] ?? key] = input[key]
  }

  return output
}

export function defineI18n(options: DefineI18nOptions = {}): I18n {
  const defaultLocale = options.defaultLocale ?? 'en'
  const messages = resolveMessages(options.messages)
  const locales = Object.keys(messages)

  return {
    locales,
    defaultLocale,
    extractLocale: (pathname) => {
      const [, segment, ...rest] = pathname.split('/')

      return segment !== defaultLocale && locales.includes(segment)
        ? { locale: segment, pathname: `/${rest.join('/')}` }
        : { locale: defaultLocale, pathname }
    },
    localizePath: (pathname, locale) => locale === defaultLocale ? pathname : `/${locale}${pathname}`,
    detectLocale: () => {
      const preferred = navigator.languages?.length ? navigator.languages : [navigator.language]

      // Each tag is tried in full (`fr-CA`) before its language subtag (`fr`), in preference order.
      const candidates = preferred.flatMap(tag => [tag, tag.split('-')[0]])

      return candidates.find(candidate => locales.includes(candidate)) ?? defaultLocale
    },
    install: async (locale) => {
      const instance = await createInstance({ locale, fallbackLocale: defaultLocale, messages })
      return app => app.provide(injectionKey, instance)
    },
  }
}
