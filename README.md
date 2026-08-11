# @kevinmarrec/vue-i18n

## Description

Opinionated [Internationalization (i18n)](https://developer.mozilla.org/en-US/docs/Glossary/Internationalization) [Vue](https://vuejs.org) [plugin](https://vuejs.org/guide/reusability/plugins).

## Opinions

- Lazy loading of locales
  - Supports JSON
  - Supports YAML (with optional requirement: [vite-plugin-yaml](https://github.com/Modyfi/vite-plugin-yaml))

- Locale is an explicit input, never sniffed behind your back
  - You pass the locale to `install()`, so server and client can agree on it
  - `detectLocale()` is available when you _want_ `navigator.language`, and is opt-in

- URL-prefix helpers for localized routing
  - The default locale serves unprefixed; every other locale gets a `/<locale>` prefix
    - `/foo` ➡️ `/fr/foo`
    - `/` ➡️ `/fr/`

- Fallbacking
  - The default locale doubles as the fallback locale
  - If the fallback locale also lacks the translation, the key is returned as is

- Message Format features
  - Standard & nested keys
    - `t('foo')` resolves `foo`
    - `t('foo.bar')` resolves `foo` ➡️ `bar`
    - `t('foo.bar.baz')` resolves `foo` ➡️ `bar` ➡️ `baz`

  - Named interpolation
    - `Hello {name}` + `t('key', { name: 'John' })` = `Hello John`

  - List interpolation
    - `Hello {0} {1}` + `t('key', ['John', 'Doe'])` = `Hello John Doe`

  - Pluralization
    - `car | cars` + `t('key', 0)` = `cars`
    - `car | cars` + `t('key', 1)` = `car`
    - `car | cars` + `t('key', 2)` = `cars`
    - `no apples | one apple | {count} apples` + `t('key', 0)` = `no apples`
    - `no apples | one apple | {count} apples` + `t('key', 1)` = `one apple`
    - `no apples | one apple | {count} apples` + `t('key', 2)` = `2 apples`

- Supports Server-Side Rendering (SSR) & Static Site Generation (SSG) without hydration mismatches

## Usage

`defineI18n()` is called once, at module scope. It derives the available locales from the message
keys and returns everything both your router and your app need:

```ts
// src/i18n.ts
import { defineI18n } from '@kevinmarrec/vue-i18n'

export const i18n = defineI18n({
  messages: import.meta.glob('./locales/*.{json,yaml,yml}'),
  defaultLocale: 'en',
})
```

| Member                           | Description                                                              |
| -------------------------------- | ------------------------------------------------------------------------ |
| `locales`                        | Locale codes derived from the message keys, e.g. `['en', 'fr']`          |
| `defaultLocale`                  | Served unprefixed, and used as the fallback locale                       |
| `extractLocale(pathname)`        | `/fr/foo` → `{ locale: 'fr', pathname: '/foo' }`                         |
| `localizePath(pathname, locale)` | `('/foo', 'fr')` → `/fr/foo`; the default locale stays unprefixed        |
| `detectLocale()`                 | Locale matching `navigator.language`, else `defaultLocale`. Browser-only |
| `install(locale)`                | Resolves to the Vue plugin, with the locale's messages already loaded    |

`install()` is asynchronous so that the base and fallback messages are loaded **before** the app
renders. That is what lets a server-rendered or prerendered document and its hydration agree.

```vue
<script setup lang="ts">
import { useI18n } from '@kevinmarrec/vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div>{{ t('welcome') }}</div>
</template>
```

### Client-side rendering

With no server-rendered HTML to agree with, `detectLocale()` is safe as the `install()` input:

```ts
import { createApp } from 'vue'

import App from './App.vue'
import { i18n } from './i18n'

const app = createApp(App)
app.use(await i18n.install(i18n.detectLocale()))
app.mount('#app')
```

### Server-side rendering & static site generation

**Do not use `detectLocale()` here.** The server cannot reach the same answer as the browser, so the
first client render would disagree with the served HTML — every translated node becomes a hydration
mismatch, and the shipped HTML is wrong for anyone who does not run JavaScript.

Derive the locale from the URL instead, on both sides, using `extractLocale()`. With
[vite-ssg](https://github.com/antfu-collective/vite-ssg):

```ts
import { ViteSSG } from 'vite-ssg'

import App from './App.vue'
import { i18n } from './i18n'
import { routes } from './routes'

export const createApp = ViteSSG(
  App,
  { routes },
  async ({ app, routePath }) => {
    const { locale } = i18n.extractLocale(routePath ?? location.pathname)
    app.use(await i18n.install(locale))
  },
)
```

Use `localizePath()` to build links and `rel="alternate"` tags for the other locales, and prerender
one document per locale.

**Trailing slashes are canonical.** A localized root path is `/fr/`, since prefixing `/` yields
`/fr` + `/`. That matches how each locale prerenders — to a directory (`fr/index.html`), which a
static host serves directly. Configure your framework to agree: with Vike, that is
`trailingSlash: true`, otherwise it normalizes `/fr/` to `/fr` and every generated link costs a
redirect.

### Switching locale

Prefer a **full page navigation** to a different localized URL — `<a rel="external">` or
`location.assign()`. Each locale then gets its own document, its own `<html lang>` and its own
plugin instance, and there is no in-page state to keep in sync.

When a full navigation is not an option, `setLocale()` loads the messages _then_ switches, so no
render observes a locale whose messages are still in flight:

```ts
const { setLocale } = useI18n()

await setLocale('fr')
```

Note that in a hydrated app this desynchronises the DOM from the HTML the server sent for that URL,
which is why it is not the recommended path.
