---
title: Launcher
---

### Overview

The launcher is the corner button that welcomes users and opens the chat. Configure it through {@link PublicConfig.launcher}, supply your own button, or skip it entirely.

A launcher is optional. Turn it off with `launcher.isOn: false` and open the chat directly with {@link PublicConfig.openChatByDefault} — the common setup for a custom-element or embedded layout that has no launcher at all.

### Configure the launcher

Pass a {@link LauncherConfig} on {@link PublicConfig.launcher}. Toggle the launcher with {@link LauncherConfig.isOn}, force the unread dot with {@link LauncherConfig.showUnreadIndicator}, and override the launcher icon per device with {@link LauncherConfig.desktop} / {@link LauncherConfig.mobile} (see {@link LauncherCallToActionConfig.avatarUrlOverride}).

```ts
import type { PublicConfig } from "@carbon/ai-chat";

const config: PublicConfig = {
  launcher: {
    isOn: true,
    showUnreadIndicator: true,
  },
};
```

### Provide your own launcher

To render your own launcher instead of the built-in one, import the launcher stylesheet and apply the float classes yourself, driving open and close from the chat's view-change methods:

```css
@import "@carbon/ai-chat/css/chat-launcher-layout.css";
```

Use the {@link ChatCustomElementProps.onViewChange} and {@link ChatCustomElementProps.onViewPreChange} methods to react to the chat opening and closing — prefer these over the {@link BusEventType.VIEW_CHANGE} and {@link BusEventType.VIEW_PRE_CHANGE} bus events. For the full pattern, see [Floating layout](./Layout.md#floating-layout) and the custom-element-as-float examples: [React](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react/custom-element-as-float) and [web component](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/web-components/custom-element-as-float).

### Launcher layout tokens

| Token                                   | Default | Description                              |
| --------------------------------------- | ------- | ---------------------------------------- |
| `--cds-aichat-launcher-default-size`    | `56px`  | Default launcher button size             |
| `--cds-aichat-launcher-position-bottom` | `48px`  | Distance from the bottom of the viewport |
| `--cds-aichat-launcher-position-right`  | `32px`  | Distance from the right of the viewport  |
| `--cds-aichat-launcher-extended-width`  | `280px` | Extended launcher width                  |

### Launcher color tokens

Defaults are Carbon theme tokens and vary by theme.

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

### Unread indicator tokens

| Token                                            | Default          | Description             |
| ------------------------------------------------ | ---------------- | ----------------------- |
| `--cds-aichat-unread-indicator-color-background` | `$support-error` | Unread badge background |
| `--cds-aichat-unread-indicator-color-text`       | `$text-on-color` | Unread badge text       |

### Related

- [Layout](./Layout.md) — layout modes, sizing tokens, the floating layout, and corner rounding.
- [Theming](./Theming.md) — set the Carbon theme and override colors that these launcher tokens build on.
- [UI customization](./Customization.md) — the hub for tailoring the chat UI.
