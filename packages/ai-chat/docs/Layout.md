---
title: Layout
---

### Overview

Control where the chat renders, size it through CSS custom properties, float it in the corner of the page, and round its corners.

### Layout modes

The standard way to use Carbon AI Chat is the custom element — {@link ChatCustomElement} in React or `cds-aichat-custom-element` as a web component. You size and place the element in your DOM and the chat grows to fill it: a sidebar, a full-screen view, or a panel nested in your UI.

The classic floating widget — a launcher in the corner and a window that opens on click — is the same custom element with the exported [float layout classes](#floating-layout) applied. Those classes are exported precisely so you can apply them yourself and drive the open and close behavior. {@link ChatContainer} and `cds-aichat-container` are a convenience that wire those classes for you; reach for them only when you'd rather skip that work.

For more information, see the documentation for [React](./React.md) and [web components](./WebComponent.md).

### Layout CSS custom properties

Size and place the chat by overriding its `--cds-aichat-*` custom properties in your own stylesheet. The properties inherit through the chat's shadow boundary, so setting them on a host element flows into the chat:

```css
.my-chat-host {
  --cds-aichat-messages-max-width: 720px;
  --cds-aichat-card-max-width: 480px;
}
```

These shared tokens apply to both the floating and custom-element layouts:

| Token                              | Default | Description                                    |
| ---------------------------------- | ------- | ---------------------------------------------- |
| `--cds-aichat-messages-max-width`  | `672px` | Maximum width for message content area         |
| `--cds-aichat-messages-min-width`  | `320px` | Minimum width for message content area         |
| `--cds-aichat-workspace-min-width` | `480px` | Minimum width for workspace panel              |
| `--cds-aichat-history-width`       | `320px` | Width of the history / conversation list panel |
| `--cds-aichat-card-max-width`      | `424px` | Maximum width for card components              |

You can also set these tokens from config through {@link LayoutConfig.customProperties} (keys come from {@link LayoutCustomProperties}) if you'd rather keep them out of a stylesheet.

### Floating layout

To float the chat, apply the exported float classes to your custom element and import the float stylesheet:

```css
@import "@carbon/ai-chat/css/chat-float-layout.css";
```

The classes drive the floating widget:

- `cds-aichat-float--open` — fixed positioning and dimensions.
- `cds-aichat-float--opening` — entrance animation.
- `cds-aichat-float--closing` — exit animation.
- `cds-aichat-float--close` — hidden.
- `cds-aichat-float--mobile` — mobile placement.

Toggle the classes as the chat opens and closes using the {@link ChatCustomElementProps.onViewChange} and {@link ChatCustomElementProps.onViewPreChange} methods — prefer these over the {@link BusEventType.VIEW_CHANGE} and {@link BusEventType.VIEW_PRE_CHANGE} bus events. For a full working pattern with open and close animations, see the custom-element-as-float examples: [React](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react/custom-element-as-float) and [web component](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/web-components/custom-element-as-float). {@link ChatContainer} applies these classes for you if you'd rather not wire them yourself.

Size and placement of the floating container come from these tokens:

| Token                          | Default                                                                   | Description                                   |
| ------------------------------ | ------------------------------------------------------------------------- | --------------------------------------------- |
| `--cds-aichat-height`          | `calc(100vh - 4rem)`                                                      | Height of the floating chat container         |
| `--cds-aichat-min-height`      | `max(150px, calc(min(256px, 100vh) - var(--cds-aichat-bottom-position)))` | Minimum height of the floating chat container |
| `--cds-aichat-max-height`      | `640px`                                                                   | Maximum height of the floating chat container |
| `--cds-aichat-width`           | `min(380px, var(--cds-aichat-max-width))`                                 | Width of the floating chat container          |
| `--cds-aichat-max-width`       | inherited                                                                 | Maximum width of the floating chat container  |
| `--cds-aichat-z-index`         | `99999`                                                                   | z-index of the floating chat container        |
| `--cds-aichat-bottom-position` | `48px`                                                                    | Distance from the bottom of the viewport      |
| `--cds-aichat-right-position`  | `32px`                                                                    | Distance from the right of the viewport       |
| `--cds-aichat-top-position`    | `auto`                                                                    | Distance from the top of the viewport         |
| `--cds-aichat-left-position`   | `auto`                                                                    | Distance from the left of the viewport        |

> **Note:** RTL uses logical `inset-inline` placement while still reading the same `--cds-aichat-right-position` and `--cds-aichat-left-position` tokens. Override those tokens under `[dir="rtl"]` if you want mirrored placement.

The launcher that opens the floating window has its own configuration and styling tokens — see [Launcher](./Launcher.md).

### Rounded corners

AI Chat components use a shared rounded modifier system to keep corners consistent across slotted content. There are two ways to use it:

1. Read the rounded modifier tokens in your own CSS.
2. Add `data-rounded` (and `data-stacked` when needed) so the system applies rounding for you.

Built-in components already carry these attributes; add `data-rounded` / `data-stacked` yourself only on your own slotted content.

**Quick guide**

| Goal                                            | Use                                                   | Why                                                   |
| ----------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| Style one surface (single element, single box)  | Read tokens in CSS                                    | You control the exact CSS and just need the value     |
| Round the first/last item in a group            | `data-rounded` on the wrapper                         | The system applies the correct corners for you        |
| The children are stacked vertically             | `data-rounded` + `data-stacked`                       | "Top" and "bottom" map to first and last in the stack |
| You need both automatic rounding and custom CSS | `data-rounded` for the group + tokens in your own CSS | Keeps everything aligned                              |

Supported values for `data-rounded`:

- `""` (empty string) for all corners
- `top`, `top-left`, `top-right`
- `bottom`, `bottom-left`, `bottom-right`

Use `data-stacked` when children are arranged in a vertical stack. Without `data-stacked`, `data-rounded="top"` and `data-rounded="bottom"` round the first and last child in a horizontal row.

#### Per-corner configuration

You can configure corners individually using {@link LayoutConfig.corners}. Pass a single {@link CornersType} value to round every corner, or a {@link PerCornerConfig} object to control each corner:

**Simple configuration (all corners the same):**

```typescript
{
  layout: {
    corners: CornersType.ROUND; // or CornersType.SQUARE
  }
}
```

**Per-corner configuration:**

```typescript
import { CornersType, PerCornerConfig } from '@carbon/ai-chat';

{
  layout: {
    corners: {
      startStart: CornersType.ROUND,  // Top-left (LTR) / Top-right (RTL)
      startEnd: CornersType.SQUARE,   // Top-right (LTR) / Top-left (RTL)
      endStart: CornersType.SQUARE,   // Bottom-left (LTR) / Bottom-right (RTL)
      endEnd: CornersType.ROUND       // Bottom-right (LTR) / Bottom-left (RTL)
    }
  }
}
```

**Partial configuration (unspecified corners fall back to {@link CornersType.ROUND}):**

```typescript
{
  layout: {
    corners: {
      startStart: CornersType.SQUARE,
      startEnd: CornersType.SQUARE
      // endStart and endEnd default to CornersType.ROUND
    }
  }
}
```

> **Note:** Corner names use CSS logical properties for RTL support. `startStart` means "block-start inline-start" which automatically maps to the correct physical corner based on text direction.

#### Corner CSS custom properties

To round your own slotted content to match, read the per-corner radius tokens. Each is RTL-safe and defaults to `layout.$spacing-03` (`0.5rem` / `8px`):

- `--cds-aichat-border-radius-start-start`
- `--cds-aichat-border-radius-start-end`
- `--cds-aichat-border-radius-end-start`
- `--cds-aichat-border-radius-end-end`

Apply them with the matching logical `border-*-radius` properties so rounding follows text direction:

```css
.my-custom-surface {
  border-start-start-radius: var(--cds-aichat-border-radius-start-start, 0);
  border-start-end-radius: var(--cds-aichat-border-radius-start-end, 0);
  border-end-start-radius: var(--cds-aichat-border-radius-end-start, 0);
  border-end-end-radius: var(--cds-aichat-border-radius-end-end, 0);
}

.my-custom-card {
  /* Round only the top corners */
  border-start-start-radius: var(--cds-aichat-border-radius-start-start);
  border-start-end-radius: var(--cds-aichat-border-radius-start-end);
}
```

Or let the system apply rounding for you with `data-rounded`. Render this into a footer slot so it inherits the correct rounding for the current layout:

```html
<div class="my-footer-actions" data-rounded="bottom" data-stacked>
  <button type="button">Cancel</button>
  <button type="button">Save</button>
</div>
```

### Related

- [Launcher](./Launcher.md) — configure or replace the launcher and style its tokens.
- [Header](./Header.md) — title, buttons, menus, and the AI label in the header bar.
- [Home screen](./Homescreen.md) — the optional landing view with greeting and starter prompts.
- [Theming](./Theming.md) — set colors, typography, and the Carbon theme that these layout tokens build on.
- [UI customization](./Customization.md) — the hub for slotting your own content and tailoring the UI.
- [Using with React](./React.md) — render the chat in a React app and choose a layout mode.
- [Using as a Web component](./WebComponent.md) — render the chat as a custom element and choose a layout mode.
