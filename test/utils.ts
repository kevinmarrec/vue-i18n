import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'

import { defineI18n, useI18n } from '../src'

interface RenderOptions {
  messages?: NonNullable<Parameters<typeof defineI18n>[0]>['messages']
  locale?: string
  template?: (t: ReturnType<typeof useI18n>['t']) => string
}

export async function render(options: RenderOptions) {
  const i18n = defineI18n({ messages: options.messages ?? {} })

  let instance!: ReturnType<typeof useI18n>

  const Component = defineComponent({
    setup() {
      instance = useI18n()
      return () => options.template?.(instance.t)
    },
  })

  const wrapper = mount(Component, {
    global: {
      plugins: [await i18n.install(options.locale ?? i18n.defaultLocale)],
    },
  })

  return { wrapper, i18n: instance }
}
