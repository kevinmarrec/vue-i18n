/// <reference types="vite/client" />
import type { FunctionPlugin } from 'vue'

import { injectionKey } from './constants'
import { createInstance } from './instance'
import type { ResolvedVueI18nOptions, VueI18nOptions } from './types'

const LOCALE_KEY_RE = /(\w*)\.(ya?ml|json)$/

function resolveMessages(input: VueI18nOptions['messages']) {
  const output = {} as ResolvedVueI18nOptions['messages']
  for (const key in input) {
    output[key.match(LOCALE_KEY_RE)?.[1] ?? key] = input[key]
  }
  return output
}

export async function createI18n(options: VueI18nOptions): Promise<FunctionPlugin> {
  const resolvedOptions: ResolvedVueI18nOptions = {
    locale: options.locale ?? 'en',
    fallbackLocale: options.fallbackLocale ?? options.locale ?? 'en',
    messages: resolveMessages(options.messages),
  }

  if (!import.meta.env.SSR) {
    const navigatorLocale = navigator.language.slice(0, 2)
    resolvedOptions.locale = resolvedOptions.messages?.[navigatorLocale] ? navigatorLocale : resolvedOptions.locale
  }

  const instance = createInstance(resolvedOptions)

  await instance.init()

  return app => app.provide(injectionKey, instance)
}
