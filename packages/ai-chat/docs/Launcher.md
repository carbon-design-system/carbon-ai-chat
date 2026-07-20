---
title: Launcher
---

## Overview

The launcher is the corner button that welcomes users and opens the chat. Configure it through the {@link PublicConfig.launcher | launcher config}, supply your own button in its place, or leave it out of the layout entirely.

The launcher is optional. Turn it off with `launcher.isOn: false` and open the chat directly with {@link PublicConfig.openChatByDefault | openChatByDefault} — the common setup for embedded layouts with no launcher.

## Configure the launcher

Pass a {@link LauncherConfig | launcher config} on the {@link PublicConfig.launcher | launcher} property. From there you can toggle the launcher's visibility with {@link LauncherConfig.isOn | isOn}, force the unread dot to appear with {@link LauncherConfig.showUnreadIndicator | showUnreadIndicator}, and override the launcher icon separately for each device through {@link LauncherConfig.desktop | desktop} and {@link LauncherConfig.mobile | mobile}.

```ts
import type { PublicConfig } from "@carbon/ai-chat";

const config: PublicConfig = {
  launcher: {
    isOn: true,
    showUnreadIndicator: true,
  },
};
```

## Provide your own launcher

To render your own launcher in place of the built-in one, import the launcher stylesheet, apply the float classes yourself, and drive the open and close transitions from the chat's view-change methods:

```css
@import "@carbon/ai-chat/css/chat-launcher-layout.css";
```

React to the chat opening and closing with the {@link ChatCustomElementProps.onViewChange | onViewChange} and {@link ChatCustomElementProps.onViewPreChange | onViewPreChange} methods, and prefer them over the matching {@link BusEventType.VIEW_CHANGE | VIEW_CHANGE} and {@link BusEventType.VIEW_PRE_CHANGE | VIEW_PRE_CHANGE} bus events. For the full pattern, see [Floating layout](./Layout.md#floating-layout) and the custom-element-as-float examples: [React](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react/custom-element-as-float) and [web component](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/web-components/custom-element-as-float).

## Launcher layout tokens

| Token                                   | Default | Description                              |
| --------------------------------------- | ------- | ---------------------------------------- |
| `--cds-aichat-launcher-default-size`    | `56px`  | Default launcher button size             |
| `--cds-aichat-launcher-position-bottom` | `48px`  | Distance from the bottom of the viewport |
| `--cds-aichat-launcher-position-right`  | `32px`  | Distance from the right of the viewport  |
| `--cds-aichat-launcher-extended-width`  | `280px` | Extended launcher width                  |

## Launcher color tokens

The defaults are Carbon theme tokens, so they vary from one theme to another.

| Token                                                            | Default                  | Description                   |
| ---------------------------------------------------------------- | ------------------------ | ----------------------------- |
| `--cds-aichat-launcher-color-background`                         | `$button-primary`        | Launcher button background    |
| `--cds-aichat-launcher-color-avatar`                             | `$text-on-color`         | Launcher avatar/icon color    |
| `--cds-aichat-launcher-color-background-hover`                   | `$button-primary-hover`  | Launcher hover state          |
| `--cds-aichat-launcher-color-background-active`                  | `$button-primary-active` | Launcher active state         |
| `--cds-aichat-launcher-color-focus-border`                       | `$text-on-color`         | Launcher focus border         |
| `--cds-aichat-launcher-mobile-color-text`                        | `$text-on-color`         | Launcher text on mobile       |
| `--cds-aichat-launcher-expanded-message-color-text`              | `$text-on-color`         | Expanded message text         |
| `--cds-aichat-launcher-expanded-message-color-background`        | `$button-primary`        | Expanded message background   |
| `--cds-aichat-launcher-expanded-message-color-background-hover`  | `$button-primary-hover`  | Expanded message hover        |
| `--cds-aichat-launcher-expanded-message-color-background-active` | `$button-primary-active` | Expanded message active       |
| `--cds-aichat-launcher-expanded-message-color-focus-border`      | `$text-on-color`         | Expanded message focus border |

## Unread indicator tokens

| Token                                            | Default          | Description             |
| ------------------------------------------------ | ---------------- | ----------------------- |
| `--cds-aichat-unread-indicator-color-background` | `$support-error` | Unread badge background |
| `--cds-aichat-unread-indicator-color-text`       | `$text-on-color` | Unread badge text       |

## Related

- [Layout](./Layout.md) — layout modes, sizing tokens, the floating layout, and corner rounding.
- [Theming](./Theming.md) — set the Carbon theme and override colors that these launcher tokens build on.
- [UI customization](./Customization.md) — the hub for tailoring the chat UI.
