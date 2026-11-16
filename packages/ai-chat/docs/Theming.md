---
title: Theming
---

## Overview

Set the chat's Carbon theme with CSS on your page. The chat reads the Carbon `--cds-*` tokens that cascade into it, so it follows the theme your page sets. If your page sets no Carbon theme, the chat renders the white theme. It reads your page background and switches to a dark theme only when your page is dark.

## Use your page's Carbon theme

If your site already uses Carbon, the chat picks up its theme. You don't need to configure anything.

## Add a Carbon theme to a page that doesn't use Carbon

Add Carbon's theme tokens at the root of your page. With Sass and `@carbon/styles`:

```scss
@use '@carbon/styles/scss/themes';
@use '@carbon/styles/scss/theme';

:root {
  @include theme.theme(themes.$g100);
}
```

Use `themes.$white`, `themes.$g10`, `themes.$g90`, or `themes.$g100`. Set the theme on `:root`, not on an element around the chat. The chat checks the page root to decide whether the theme is light or dark, so a theme set on a smaller element can leave parts of the chat in the wrong mode.

## Override specific colors

The chat exposes two layers of CSS custom properties:

- `--cds-aichat-*` tokens style the chat's own shell and launcher.
- The underlying Carbon `--cds-*` tokens style the Carbon components rendered inside the chat — buttons, links, inputs, and surfaces.

Set them on an element that contains the chat. They inherit through the chat's shadow boundary, so the chat picks them up:

```css
.my-host {
  /* Chat shell tokens */
  --cds-aichat-launcher-color-background: #1a1a2e;
  /* Carbon component tokens */
  --cds-link-primary: #1a1a2e;
  --cds-button-primary: #1a1a2e;
}
```

## Deprecated: force a theme from config

> **Deprecated:** {@link PublicConfig.injectCarbonTheme | injectCarbonTheme} and {@link LayoutConfig.customProperties | customProperties} are deprecated, and 2.0.0 removes them. Set your theme and your overrides with CSS instead, as shown above. Both keep working until 2.0.0. [ADR-0004](https://github.com/carbon-design-system/carbon-ai-chat/blob/main/docs/adr/0004-component-styling-contract.md) explains the change.

`injectCarbonTheme` forces one of four themes — {@link CarbonTheme.WHITE}, {@link CarbonTheme.G10}, {@link CarbonTheme.G90}, or {@link CarbonTheme.G100} — by injecting its tokens into the chat's shadow DOM. A forced theme also stops page-level `--cds-*` overrides from reaching the Carbon components inside the chat. Until you move off it, set those overrides through `customProperties`, which the chat injects inside its own DOM. A bare key sets a `--cds-aichat-*` token, and a key prefixed with `$` sets a Carbon `--cds-*` token. `$`-prefixed values must be hexadecimal colors.

```tsx
import { ChatContainer, CarbonTheme } from '@carbon/ai-chat';
import type { PublicConfig } from '@carbon/ai-chat';

// Deprecated: removed in 2.0.0. Use page CSS instead.
const config: PublicConfig = {
  injectCarbonTheme: CarbonTheme.G100,
  layout: {
    customProperties: {
      // Chat shell token -> --cds-aichat-launcher-color-background
      'launcher-color-background': '#1a1a2e',
      // Carbon component tokens -> --cds-button-primary / --cds-link-primary
      '$button-primary': '#1a1a2e',
      '$link-primary': '#1a1a2e',
    },
  },
};

function App() {
  return <ChatContainer {...config} />;
}
```

To move to CSS, drop `injectCarbonTheme`, add the theme to your page as shown above, and turn each `customProperties` key into a custom property: `'launcher-color-background'` becomes `--cds-aichat-launcher-color-background`, and `'$button-primary'` becomes `--cds-button-primary`.

See [React](./React.md) and [web components](./WebComponent.md) for how config reaches the chat.

## Related

- [Layout](./Layout.md) — the `--cds-aichat-*` sizing and placement tokens. [Launcher](./Launcher.md) covers the launcher and unread-indicator tokens.
- [@carbon/themes](https://github.com/carbon-design-system/carbon/tree/main/packages/themes) — theme tokens and palette.
- {@link PublicConfig} — full config reference.
