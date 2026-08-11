import { readonly, ref, type Ref } from 'vue'

import type { LocaleMessageDictionary, LocaleMessages, LocaleMessageValue, ResolvedOptions } from './types'

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
  locale: Readonly<Ref<string>>
  fallbackLocale: string
  messages: Readonly<Ref<LocaleMessages>>
  /**
   * Loads the locale messages, *then* switches to it, so no render ever observes a locale whose
   * messages are still in flight.
   */
  setLocale: (locale: string) => Promise<void>
  t: TranslateFn
}

export async function createInstance(options: ResolvedOptions): Promise<VueI18nInstance> {
  const locale = ref(options.locale)
  const messages = ref<LocaleMessages>({})

  const loadMessages = async (locale: string) => {
    const source = options.messages[locale]

    if (source)
      messages.value[locale] = typeof source === 'function' ? (await source() as any).default : source
  }

  const findLocaleMessage = (locale: string, key: string) =>
    key.includes('.')
      ? key.split('.').reduce<LocaleMessageValue | undefined>((path, segment) =>
          (path as LocaleMessageDictionary | undefined)?.[segment], messages.value[locale])
      : messages.value[locale]?.[key]

  // Both are awaited: a fallback loading in the background would let a render resolve a key the
  // next one resolves differently.
  await Promise.all([...new Set([options.locale, options.fallbackLocale])].map(loadMessages))

  return {
    locale: readonly(locale),
    fallbackLocale: options.fallbackLocale,
    messages: readonly(messages),
    setLocale: async (next) => {
      await loadMessages(next)
      locale.value = next
    },
    t: (key, ...params: any[]) => {
      // `??`, not `||`: an empty translation is a deliberate one, not a missing one.
      let message = findLocaleMessage(locale.value, key) ?? findLocaleMessage(options.fallbackLocale, key)

      if (typeof message !== 'string')
        return key

      if (!params.length && !message.includes('|') && !message.includes('{'))
        return message

      const values: { [key: string]: string | number } = typeof params[0] === 'number'
        ? { count: params[0], n: params[0], ...params[1] }
        : { ...params[0] }

      if (message.includes('|')) {
        const count = [values.count, values.n].find(x => typeof x === 'number') ?? 1
        // Clamped between 0 and 2. Only exactly 1 is singular, so a fractional count is plural.
        const clamped = Number.isInteger(count) ? Math.min(Math.abs(count), 2) : 2
        const parts = message.split(PLURAL_SEPARATOR_RE)
        const rules = parts.length > 2 ? [0, 1, 2] : [1, 0, 1] // (no apple | one apple | many apples) VS (car | cars)
        message = parts[rules[clamped]]
      }

      return message.replace(INTERPOLATION_RE, (_, p1) => String(values[p1] ?? ''))
    },
  }
}
