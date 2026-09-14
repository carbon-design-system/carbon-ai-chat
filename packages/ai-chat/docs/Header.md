---
title: Header
---

## Overview

The header is the bar across the top of the chat; it is displayed by default, and you configure it by setting {@link PublicConfig.header | header} to a {@link HeaderConfig}. To remove the header entirely, set {@link HeaderConfig.isOn | isOn} to `false`, which is useful when a fullscreen or embedded chat reuses your application's own header.

```ts
import type { PublicConfig } from '@carbon/ai-chat';

const config: PublicConfig = {
  header: {
    title: 'Acme Assistant',
    name: 'Acme',
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

## Custom header (CUSTOM_HEADER)

Supply your own header bar by writing to the {@link WriteableElementName.CUSTOM_HEADER} slot. When that slot has content the chat mounts no header of its own and your content fills the header area directly.

### Replacement semantics

The built-in header component is not mounted while `CUSTOM_HEADER` has content. The framework renders your content into the shell's `slot="header"` position. Adding content post-boot causes the framework header to unmount; removing it causes the framework header to remount.

### Config fields ignored while a custom header is present

The following {@link HeaderConfig} fields are ignored while `CUSTOM_HEADER` has content, because the built-in header component is never mounted:

- `title`, `name`
- `menuOptions`, `actions`
- `minimizeButtonIconType`, `hideMinimizeButton`
- `showRestartButton`
- `showAiLabel`, `hideDefaultAiLabelContent`
- `hasContentMaxWidth`

### `isOn` still applies

Setting {@link HeaderConfig.isOn | isOn} to `false` hides the header area entirely — your custom content is hidden along with the framework header. Use this when a fullscreen or embedded layout should have no visible header at all.

### Nested-slot consequences

{@link WriteableElementName.HEADER_FIXED_ACTIONS_ELEMENT} lives inside the built-in `<Header>` component. Because that component is never mounted when `CUSTOM_HEADER` is active, `HEADER_FIXED_ACTIONS_ELEMENT` also never renders. Supply your own action buttons directly inside your custom header content.

{@link WriteableElementName.HEADER_BOTTOM_ELEMENT} and {@link WriteableElementName.HOME_SCREEN_HEADER_BOTTOM_ELEMENT} are unaffected — they are placed in `slot="header-after"` (below the header row), not inside the header component.

### Mobile history host responsibility

When the history panel is in mobile mode (the chat is too narrow to show history alongside messages), the built-in header normally renders a menu that lets users open the history panel. With `CUSTOM_HEADER` active that menu is never rendered. If you use `history.isOn: true` in a layout narrow enough to trigger mobile mode, your custom header must supply its own controls:

```ts
// Read the current mobile state
const isMobile = instance.getState().historyPanelState.isMobile;

// Open the history panel imperatively from your custom header
import { PanelType } from '@carbon/ai-chat';
instance.customPanels.getPanel(PanelType.HISTORY)?.open();
```

To suppress the built-in mobile menu (and the associated developer warning) without supplying your own, set `history.showMobileMenu: false`. See [CustomHistory.md](./CustomHistory.md) for the full mobile history API.

### Accessibility

Your custom header is rendered in place of the `<header>` landmark provided by the built-in component. Supply an accessible region name so screen readers announce the landmark correctly:

```html
<div role="banner" aria-label="Application header">…</div>
```

## Related

- [Layout](./Layout.md) — layout modes, sizing tokens, the floating layout, and corner rounding.
- [Slots](./WriteableElements.md) — render your own content into the AI label popover and other slots.
- [UI customization](./Customization.md) — the hub for tailoring the chat UI.
