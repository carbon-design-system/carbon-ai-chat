---
title: Header
---

## Overview

The header is the bar across the top of the chat; it is displayed by default, and you configure it by setting {@link PublicConfig.header | header} to a {@link HeaderConfig}. To remove the header entirely, set {@link HeaderConfig.isOn | isOn} to `false`, which is useful when a fullscreen or embedded chat reuses your application's own header.

```ts
import type { PublicConfig } from "@carbon/ai-chat";

const config: PublicConfig = {
  header: {
    title: "Acme Assistant",
    name: "Acme",
  },
};
```

## Title and name

Set {@link HeaderConfig.title | title} for the header title and {@link HeaderConfig.name | name} for the **bolded** name shown directly after it.

## Built-in buttons

The header renders a minimize button and an optional restart button:

- {@link HeaderConfig.minimizeButtonIconType | minimizeButtonIconType} picks the minimize icon from {@link MinimizeButtonIconType} — close, minimize, or a side-panel direction — and {@link HeaderConfig.hideMinimizeButton | hideMinimizeButton} removes it.
- {@link HeaderConfig.showRestartButton | showRestartButton} adds a button that restarts the conversation, on both the home screen and the main chat.

## Custom menu and actions

Add your own entries to the header overflow menu with {@link HeaderConfig.menuOptions | menuOptions}, an array of {@link CustomMenuOption}. For richer toolbar controls, {@link HeaderConfig.actions | actions} renders custom buttons that overflow into a menu when space is tight, and the built-in restart and close buttons are appended after them.

## AI label

The header shows the AI label by default, and you toggle it with {@link HeaderConfig.showAiLabel | showAiLabel}. To replace the default popover content with your own, set {@link HeaderConfig.hideDefaultAiLabelContent | hideDefaultAiLabelContent} to `true` and render into the {@link WriteableElementName.EXPLAINABILITY_POPOVER_CONTENT | popover content} and {@link WriteableElementName.EXPLAINABILITY_POPOVER_ACTIONS | popover actions} slots — see [Slots](./WriteableElements.md).

## Width

By default, the header spans the full width of the chat, but you can set {@link HeaderConfig.hasContentMaxWidth | hasContentMaxWidth} to `true` to constrain it to the message content width (`--cds-aichat-messages-max-width`) instead — see [Layout](./Layout.md#layout-css-custom-properties).

## Related

- [Layout](./Layout.md) — layout modes, sizing tokens, the floating layout, and corner rounding.
- [Slots](./WriteableElements.md) — render your own content into the AI label popover and other slots.
- [UI customization](./Customization.md) — the hub for tailoring the chat UI.
