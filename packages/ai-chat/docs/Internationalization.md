---
title: Internationalization
---

## Overview

Translate the chat's built-in text, format dates and times for a region, and render right-to-left languages.

## Languages

Most content in Carbon AI Chat originates from an assistant, so it displays in whatever language the assistant wrote it in. Some text is hard-coded, however, such as the "Type something..." placeholder in the input field or "Choose a date" on the date picker; these strings display in English by default, but you can change them.

To change any text string, pass a {@link PublicConfig.strings | strings} prop to the React or web component, providing a partial language pack object that merges with the defaults. The {@link LanguagePack} type lists the available string keys.

Language packs use the [ICU Message Format](http://userguide.icu-project.org/formatparse/messages).

Example (React):

```tsx
<ChatContainer strings={{ input_placeholder: "Ask me anything..." }} />
```

Example (Lit web component):

```html
<cds-aichat-container .strings=${{ input_placeholder: "Ask me anything..." }}>
</cds-aichat-container>
```

## Locales

Carbon AI Chat also supports locales that carry a more specific region code, such as `en-gb`. The region code does more than set the language; it also controls formatting such as dates and times. UK English dates use the `dd/mm/yyyy` format, for instance, while US English dates use `mm/dd/yyyy`.

Carbon AI Chat supports the locales the [dayjs library](https://github.com/iamkun/dayjs/tree/dev/src/locale) provides.

To switch the locale, set {@link PublicConfig.locale | locale} to the appropriate region code.

## Bi-directional support

Some languages read from left to right (`ltr`) while others read from right to left (`rtl`), and Carbon AI Chat renders text in the same direction as the page by following the `dir` attribute on the `<html>` tag.

## Related

- [Overview](./Overview.md) — install and configure the chat.
- {@link PublicConfig} — the full configuration reference, including {@link PublicConfig.strings} and {@link PublicConfig.locale}.
