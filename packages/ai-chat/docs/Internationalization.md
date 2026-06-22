---
title: Internationalization
---

### Overview

Translate the chat's built-in text, format dates and times for a region, and render right-to-left languages.

### Languages

Most content that displays in Carbon AI Chat originates from an assistant and displays in the language it was written in. However, some text is hard-coded — for example, the "Type something..." placeholder in the input field or "Choose a date" on the date picker. These display in English by default, but you can change them.

To change any text string, pass a {@link PublicConfig.strings} prop to the React or web component. Provide a partial language pack object; it merges with the defaults. The available string keys come from the {@link LanguagePack} type.

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

### Locales

Carbon AI Chat also supports locales with a more specific region code (e.g. `en-gb`). The region goes beyond the language and controls things like date and time formatting. For example, UK English dates use the `dd/mm/yyyy` format, while US English dates use `mm/dd/yyyy`.

Carbon AI Chat supports the locales the [dayjs library](https://github.com/iamkun/dayjs/tree/dev/src/locale) provides.

Switch the locale by updating {@link PublicConfig.locale} with the appropriate region code.

### Bi-directional support

Some languages are read from left to right (`ltr`), and others from right to left (`rtl`). The Carbon AI Chat renders text in the same direction as the page based on the `dir` attribute on the `<html>` tag.

### Related

- [Overview](./Overview.md) — install and configure the chat.
- {@link PublicConfig} — the full configuration reference, including {@link PublicConfig.strings} and {@link PublicConfig.locale}.
