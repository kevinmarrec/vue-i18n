/**
 * @vitest-environment happy-dom
 */

import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'

import { useI18n } from '../src'
import { render } from './utils'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('composable', () => {
  describe('locale behaviors', () => {
    it('default locale', async () => {
      const { wrapper } = await render({
        messages: {
          './locales/en.json': () => Promise.resolve({
            default: {
              welcome: 'Welcome !',
            },
          }),
        },
        template: t => t('welcome'),
      })

      expect(wrapper.text()).toBe('Welcome !')
    })

    it('fallback locale (when translation not found)', async () => {
      const { wrapper } = await render({
        locale: 'fr',
        messages: {
          en: {
            welcome: 'Welcome!',
          },
          fr: {},
        },
        template: t => t('welcome'),
      })

      expect(wrapper.text()).toBe('Welcome!')
    })

    it('raw key (when fallback translation also not found)', async () => {
      const { wrapper } = await render({
        template: t => t('welcome'),
      })

      expect(wrapper.text()).toBe('welcome')
    })

    it('empty translation (honoured instead of falling back)', async () => {
      const { wrapper } = await render({
        locale: 'fr',
        messages: {
          en: {
            legalNotice: 'Terms apply.',
          },
          fr: {
            legalNotice: '',
          },
        },
        template: t => t('legalNotice'),
      })

      expect(wrapper.text()).toBe('')
    })
  })

  describe('translation behaviors', () => {
    it('nested key', async () => {
      const { wrapper } = await render({
        messages: {
          en: {
            greetings: {
              welcome: 'Welcome!',
            },
          },
        },
        template: t => t('greetings.welcome'),
      })

      expect(wrapper.text()).toBe('Welcome!')
    })

    it('named interpolation', async () => {
      const { wrapper } = await render({
        messages: {
          en: {
            welcome: 'Welcome, {name}!',
          },
        },
        template: t => t('welcome', { name: 'John' }),
      })

      expect(wrapper.text()).toBe('Welcome, John!')
    })

    it('named interpolation (when value is not provided)', async () => {
      const { wrapper } = await render({
        template: t => t('message'),
        messages: {
          en: {
            message: '{content}',
          },
        },
      })

      expect(wrapper.text()).toBe('')
    })

    it('list interpolation', async () => {
      const { wrapper } = await render({
        messages: {
          en: {
            welcome: 'Welcome, {0} {1}!',
          },
        },
        template: t => t('welcome', ['John', 'Doe']),
      })

      expect(wrapper.text()).toBe('Welcome, John Doe!')
    })

    it('pluralization (fractional count takes the plural form)', async () => {
      const { wrapper } = await render({
        messages: {
          en: {
            cars: 'car | cars',
            apples: 'no apples | one apple | {count} apples',
          },
        },
        template: t => [
          t('cars', 1.5),
          t('cars', 0.5),
          t('apples', 1.5),
          t('apples', 0.5),
        ].join('\n'),
      })

      expect(wrapper.text()).toBe([
        'cars',
        'cars',
        '1.5 apples',
        '0.5 apples',
      ].join('\n'))
    })

    it('pluralization', async () => {
      const { wrapper } = await render({
        messages: {
          en: {
            cars: 'car | cars',
            apples: 'no apples | one apple | {count} apples',
          },
        },
        template: t => [
          t('cars'),
          t('cars', 0),
          t('cars', 1),
          t('cars', 2),
          t('apples'),
          t('apples', 0),
          t('apples', 1),
          t('apples', 2),
        ].join('\n'),
      })

      expect(wrapper.text()).toBe([
        'car',
        'cars',
        'car',
        'cars',
        'one apple',
        'no apples',
        'one apple',
        '2 apples',
      ].join('\n'))
    })
  })

  it('should throw error when plugin has not been installed', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(() => mount(defineComponent({ setup: () => useI18n() })))
      .toThrow('Plugin has not been installed')
  })
})
