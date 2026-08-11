/**
 * @vitest-environment happy-dom
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

import { defineI18n } from '../src'
import { render } from './utils'

afterEach(() => {
  vi.unstubAllGlobals()
})

const messages = {
  './locales/en.yml': () => Promise.resolve({ default: { welcome: 'Welcome !' } }),
  './locales/fr.yml': () => Promise.resolve({ default: { welcome: 'Bienvenue !' } }),
}

describe('defineI18n', () => {
  describe('locales', () => {
    it('derives locales from message keys', () => {
      expect(defineI18n({ messages }).locales).toEqual(['en', 'fr'])
    })

    it('defaults defaultLocale to en', () => {
      expect(defineI18n({ messages }).defaultLocale).toBe('en')
    })

    it('honours an explicit defaultLocale', () => {
      expect(defineI18n({ messages, defaultLocale: 'fr' }).defaultLocale).toBe('fr')
    })
  })

  describe('extractLocale', () => {
    const { extractLocale } = defineI18n({ messages })

    it('extracts a prefixed locale', () => {
      expect(extractLocale('/fr/foo')).toEqual({ locale: 'fr', pathname: '/foo' })
    })

    it('extracts a prefixed locale from a nested path', () => {
      expect(extractLocale('/fr/foo/bar')).toEqual({ locale: 'fr', pathname: '/foo/bar' })
    })

    it('extracts a prefixed locale without trailing path', () => {
      expect(extractLocale('/fr')).toEqual({ locale: 'fr', pathname: '/' })
      expect(extractLocale('/fr/')).toEqual({ locale: 'fr', pathname: '/' })
    })

    it('falls back to the default locale on an unprefixed path', () => {
      expect(extractLocale('/foo')).toEqual({ locale: 'en', pathname: '/foo' })
      expect(extractLocale('/')).toEqual({ locale: 'en', pathname: '/' })
    })

    it('does not treat the default locale as a prefix', () => {
      expect(extractLocale('/en/foo')).toEqual({ locale: 'en', pathname: '/en/foo' })
    })

    it('does not treat an unknown locale as a prefix', () => {
      expect(extractLocale('/de/foo')).toEqual({ locale: 'en', pathname: '/de/foo' })
    })
  })

  describe('localizePath', () => {
    const { localizePath } = defineI18n({ messages })

    it('prefixes a non-default locale', () => {
      expect(localizePath('/foo', 'fr')).toBe('/fr/foo')
      expect(localizePath('/', 'fr')).toBe('/fr/')
    })

    it('leaves the default locale unprefixed', () => {
      expect(localizePath('/foo', 'en')).toBe('/foo')
      expect(localizePath('/', 'en')).toBe('/')
    })

    it('round-trips with extractLocale', () => {
      const { extractLocale, localizePath } = defineI18n({ messages })

      for (const locale of ['en', 'fr']) {
        for (const pathname of ['/', '/foo', '/foo/bar']) {
          expect(extractLocale(localizePath(pathname, locale))).toEqual({ locale, pathname })
        }
      }
    })
  })

  describe('locale tags with a region subtag', () => {
    const regional = {
      './locales/en.yml': () => Promise.resolve({ default: { welcome: 'Welcome !' } }),
      './locales/pt-BR.yml': () => Promise.resolve({ default: { welcome: 'Bem-vindo !' } }),
      './locales/zh-Hans.json': () => Promise.resolve({ default: { welcome: '欢迎 !' } }),
    }

    it('keeps the full tag as the locale', () => {
      expect(defineI18n({ messages: regional }).locales).toEqual(['en', 'pt-BR', 'zh-Hans'])
    })

    it('extracts a region-qualified prefix', () => {
      const { extractLocale } = defineI18n({ messages: regional })
      expect(extractLocale('/pt-BR/foo')).toEqual({ locale: 'pt-BR', pathname: '/foo' })
      expect(extractLocale('/zh-Hans/')).toEqual({ locale: 'zh-Hans', pathname: '/' })
    })

    it('localizes with a region-qualified locale', () => {
      const { localizePath } = defineI18n({ messages: regional })
      expect(localizePath('/foo', 'pt-BR')).toBe('/pt-BR/foo')
    })

    it('loads the messages of a region-qualified locale', async () => {
      const { wrapper } = await render({ messages: regional, locale: 'pt-BR', template: t => t('welcome') })
      expect(wrapper.text()).toBe('Bem-vindo !')
    })
  })

  describe('detectLocale', () => {
    it('prefers an exact tag match', () => {
      vi.stubGlobal('navigator', { languages: ['pt-BR', 'en'] })
      expect(defineI18n({ messages: { 'pt-BR': {}, 'pt': {}, 'en': {} } }).detectLocale()).toBe('pt-BR')
    })

    it('falls back to the language subtag', () => {
      vi.stubGlobal('navigator', { languages: ['fr-CA'] })
      expect(defineI18n({ messages }).detectLocale()).toBe('fr')
    })

    it('honours the order of navigator.languages', () => {
      vi.stubGlobal('navigator', { languages: ['de-DE', 'fr-FR', 'en-GB'] })
      expect(defineI18n({ messages }).detectLocale()).toBe('fr')
    })

    it('falls back to navigator.language when languages is unavailable', () => {
      vi.stubGlobal('navigator', { language: 'fr-FR' })
      expect(defineI18n({ messages }).detectLocale()).toBe('fr')
    })

    it('returns the default locale when nothing matches', () => {
      vi.stubGlobal('navigator', { languages: ['de-DE', 'it-IT'] })
      expect(defineI18n({ messages }).detectLocale()).toBe('en')
    })
  })

  describe('install', () => {
    it('returns a plugin', async () => {
      expect(await defineI18n({ messages }).install('en')).toBeInstanceOf(Function)
    })

    it('ignores the navigator locale', async () => {
      vi.stubGlobal('navigator', { language: 'fr-FR' })

      const { wrapper } = await render({ messages, locale: 'en', template: t => t('welcome') })

      expect(wrapper.text()).toBe('Welcome !')
    })

    it('loads the requested locale', async () => {
      const { wrapper } = await render({ messages, locale: 'fr', template: t => t('welcome') })

      expect(wrapper.text()).toBe('Bienvenue !')
    })

    it('loads the fallback locale before rendering', async () => {
      const { wrapper } = await render({
        locale: 'fr',
        messages: {
          './locales/en.yml': () => Promise.resolve({ default: { welcome: 'Welcome !', only: 'English only' } }),
          './locales/fr.yml': () => Promise.resolve({ default: { welcome: 'Bienvenue !' } }),
        },
        template: t => t('only'),
      })

      expect(wrapper.text()).toBe('English only')
    })
  })

  describe('setLocale', () => {
    it('loads messages before the locale becomes observable', async () => {
      const { wrapper, i18n } = await render({ messages, locale: 'en', template: t => t('welcome') })

      const pending = i18n.setLocale('fr')
      expect(wrapper.text()).toBe('Welcome !')

      await pending
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toBe('Bienvenue !')
    })
  })
})
