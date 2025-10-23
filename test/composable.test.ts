/**
 * @vitest-environment happy-dom
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

import { render } from './utils'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('composable', () => {
  describe('locale behaviors', () => {
    it('default locale', async () => {
      const wrapper = await render({
        messages: {
          './locales/en.json': () => Promise.resolve({
            default: {
              welcome: 'Welcome !',
            },
          }),
        },
        template: t => t('welcome'),
      })

      await vi.waitFor(() => {
        expect(wrapper.text()).toBe('Welcome !')
      })
    })

    it('navigator language', async () => {
      vi.stubGlobal('navigator', {
        language: 'fr-FR',
      })

      const wrapper = await render({
        messages: {
          en: {
            welcome: 'Welcome!',
          },
          fr: {
            welcome: 'Bienvenue !',
          },
        },
        template: t => t('welcome'),
      })

      await vi.waitFor(() => {
        expect(wrapper.text()).toBe('Bienvenue !')
      })
    })

    it('fallback locale (when translation not found)', async () => {
      vi.stubGlobal('navigator', {
        language: 'fr-FR',
      })

      const wrapper = await render({
        messages: {
          en: {
            welcome: 'Welcome!',
          },
        },
        template: t => t('welcome'),
      })

      expect(wrapper.text()).toBe('Welcome!')
    })

    it('raw key (when fallback translation also not found)', async () => {
      const wrapper = await render({
        template: t => t('welcome'),
      })

      expect(wrapper.text()).toBe('welcome')
    })
  })

  describe('translation behaviors', () => {
    it('named interpolation', async () => {
      const wrapper = await render({
        messages: {
          en: {
            welcome: 'Welcome, {name}!',
          },
        },
        template: t => t('welcome', { name: 'John' }),
      })

      await vi.waitFor(() => {
        expect(wrapper.text()).toBe('Welcome, John!')
      })
    })

    it('named interpolation (when value is not provided)', async () => {
      const wrapper = await render({
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
      const wrapper = await render({
        messages: {
          en: {
            welcome: 'Welcome, {0} {1}!',
          },
        },
        template: t => t('welcome', ['John', 'Doe']),
      })

      await vi.waitFor(() => {
        expect(wrapper.text()).toBe('Welcome, John Doe!')
      })
    })

    it('pluralization', async () => {
      const wrapper = await render({
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

  it('should throw error when plugin has not been installed', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(render()).rejects.toThrowError('Plugin has not been installed')
  })
})
