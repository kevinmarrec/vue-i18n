import { readonly, ref, type Ref, watch } from 'vue'

import type { LocaleMessageDictionary, LocaleMessages, LocaleMessageValue, ResolvedVueI18nOptions } from './types'

const PLURAL_SEPARATOR_RE = /\s*\|\s*/
const INTERPOLATION_RE = /\{(\w+)\}/g

interface TranslateFn {
  (key: string): string
  (key: string, count: number, values?: Array<string | number>): string
  (key: string, count: number, values?: Record<string | number, string | number>): string
  (key: string, values: Array<string | number>): string
  (key: string, values: Record<string | number, string | number>): string
}

export interface VueI18nInstance {
  availableLocales: string[]
  locale: Ref<string>
  fallbackLocale: Ref<string>
  messages: Readonly<Ref<LocaleMessages>>
  init: () => Promise<void>
  t: TranslateFn
}

export function createInstance(options: ResolvedVueI18nOptions): VueI18nInstance {
  const availableLocales = Object.keys(options.messages)
  const locale = ref(options.locale)
  const fallbackLocale = ref(options.fallbackLocale)
  const messages = ref<LocaleMessages>({})

  const loadMessages = async (locale: string) => {
    messages.value[locale] = typeof options.messages[locale] === 'function'
      ? (await options.messages[locale]() as any).default
      : options.messages[locale]
  }

  const findLocaleMessage = (locale: string, key: string) =>
    key.includes('.')
      ? key.split('.').reduce<LocaleMessageValue | undefined>((path, segment) =>
        (path as LocaleMessageDictionary | undefined)?.[segment], messages.value[locale])
      : messages.value[locale]?.[key]

  watch(locale, loadMessages)

  return {
    availableLocales,
    locale,
    fallbackLocale,
    messages: readonly(messages),
    init: async () => {
      await loadMessages(locale.value)
      loadMessages(fallbackLocale.value)
    },
    t: (key, ...params: any[]) => {
      let message = findLocaleMessage(locale.value, key) || findLocaleMessage(fallbackLocale.value, key)

      if (typeof message !== 'string')
        return key

      if (!params.length && !message.includes('|') && !message.includes('{'))
        return message

      const values: { [key: string]: string | number } = typeof params[0] === 'number'
        ? { count: params[0], n: params[0], ...params[1] }
        : { ...params[0] }

      if (message.includes('|')) {
        const count = [values.count, values.n].find(x => typeof x === 'number') ?? 1
        const clamped = Math.min(Math.abs(count), 2) // Clamp between 0 and 2
        const parts = message.split(PLURAL_SEPARATOR_RE)
        const rules = parts.length > 2 ? [0, 1, 2] : [1, 0, 1] // (no apple | one apple | many apples) VS (car | cars)
        message = parts[rules[clamped]]
      }

      return message.replace(INTERPOLATION_RE, (_, p1) => String(values[p1] ?? ''))
    },
  }
}
