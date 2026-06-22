---
title: Theming
---

### Overview

Customize the Carbon theme of the chat. By default, it inherits a Carbon theme from the host page. If your site doesn't use Carbon and you don't set `injectCarbonTheme`, the chat renders the white theme — it reads your page background and switches to a dark theme only if your page is dark. To take control, pick one of four built-in themes or inject your own and override specific colors.

### Pick a built-in theme

If your site doesn't use Carbon, set {@link PublicConfig.injectCarbonTheme} to one of four themes:

- {@link CarbonTheme.WHITE}
- {@link CarbonTheme.G10} (Gray 10)
- {@link CarbonTheme.G90} (Gray 90)
- {@link CarbonTheme.G100} (Gray 100)

This injects the correct CSS custom properties into the chat's shadow DOM.

Set `injectCarbonTheme` on the {@link PublicConfig} object you pass to the container:

```tsx
import { ChatContainer, CarbonTheme } from "@carbon/ai-chat";
import type { PublicConfig } from "@carbon/ai-chat";

const config: PublicConfig = {
  injectCarbonTheme: CarbonTheme.G100,
};

function App() {
  return <ChatContainer {...config} />;
}
```

See [React](./React.md) and [web components](./WebComponent.md) for how config reaches the chat.

### Override specific colors

The chat exposes two layers of CSS custom properties you can override from your own stylesheet:

- `--cds-aichat-*` tokens style the chat's own shell and launcher.
- The underlying Carbon `--cds-*` tokens style the Carbon components rendered inside the chat — buttons, links, inputs, and surfaces.

Custom properties inherit through the chat's shadow boundary, so setting them on a host element flows into the chat:

```css
.my-host {
  /* Chat shell token */
  --cds-aichat-launcher-color-background: #1a1a2e;
  /* Carbon component tokens */
  --cds-link-primary: #1a1a2e;
  --cds-button-primary: #1a1a2e;
}
```

The chat picks up your `--cds-*` overrides whenever it inherits its theme from the page — the default, or when your site uses Carbon. If you force a theme with `injectCarbonTheme`, the chat supplies its own Carbon tokens, so recolor the shell with the `--cds-aichat-*` tokens instead (or override `--cds-*` in inherit mode).

[Layout](./Layout.md) documents the `--cds-aichat-*` sizing and placement tokens and how to set them through {@link LayoutConfig.customProperties}; [Launcher](./Launcher.md) documents the launcher and unread-indicator tokens.

### Related

- [Layout](./Layout.md) — override `--cds-aichat-*` tokens and size the chat.
- [@carbon/themes](https://github.com/carbon-design-system/carbon/tree/main/packages/themes) — theme tokens and palette.
- {@link PublicConfig} — full config reference.
