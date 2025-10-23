import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'

import { createI18n, useI18n } from '../src'

interface RenderOptions {
  messages?: Parameters<typeof createI18n>[0]['messages']
  template?: (t: ReturnType<typeof useI18n>['t']) => string
}

export async function render(options?: RenderOptions) {
  if (!options) {
    return mount(defineComponent({ setup: () => useI18n() }))
  }

  const Component = defineComponent({
    setup() {
      const { t } = useI18n()
      return () => options.template?.(t)
    },
  })

  return mount(Component, {
    global: {
      plugins: [await createI18n({ messages: options.messages })],
    },
  })
}
