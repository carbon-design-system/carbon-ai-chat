---
title: UI customization
---

### Overview

There are a few ways to customize the UI: configuration, CSS custom properties and styles, slots, and custom responses from your assistant.

### Theming

You can customize the Carbon theme of the Carbon AI Chat. By default, it will inherit a Carbon theme from the host page. If the rest of your site does not use Carbon, you may choose one of four Carbon themes by using the {@link PublicConfig.injectCarbonTheme} property:

- White
- Gray 10
- Gray 90
- Gray 100

This will inject the correct CSS custom properties into the Carbon AI Chat's shadow DOM.

Alternatively, if you want to pick your own colors, you can inject the Carbon theme on your own and then override specific colors.

For more information, see [@carbon/themes](https://github.com/carbon-design-system/carbon/tree/main/packages/themes) and the documentation for {@link PublicConfig}.

### Layout and shell

#### Layout modes

Both the web component and React versions of Carbon AI Chat provide a floating layout (launcher in the corner and a window that opens on click) and a custom-element layout where you provide the size and placement in your DOM. In the latter scenario, the chat grows to the size of the container you provide and responds to size changes.

For more information, see the documentation for [React](React.md) and [web components](WebComponent.md).

#### CSS custom properties

You can override layout-related CSS custom properties using `layout.customProperties`. Keys correspond to values from {@link LayoutCustomProperties} and map to the underlying `--cds-aichat-*` custom properties.

Example:

```ts
const config = {
  layout: {
    customProperties: {
      width: "420px",
      height: "560px",
      "messages-max-width": "720px",
    },
  },
};
```

##### Shared layout tokens (float and custom element layouts)

| Token                              | Default | Description                                    |
| ---------------------------------- | ------- | ---------------------------------------------- |
| `--cds-aichat-messages-max-width`  | `672px` | Maximum width for message content area         |
| `--cds-aichat-messages-min-width`  | `320px` | Minimum width for message content area         |
| `--cds-aichat-workspace-min-width` | `480px` | Minimum width for workspace panel              |
| `--cds-aichat-history-width`       | `320px` | Width of the history / conversation list panel |
| `--cds-aichat-card-max-width`      | `424px` | Maximum width for card components              |

##### Floating container layout tokens (float layout only)

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

Note: RTL uses logical `inset-inline` placement while still reading the same `--cds-aichat-right-position` and `--cds-aichat-left-position` tokens. Override those tokens under `[dir="rtl"]` if you want mirrored placement.

##### Launcher layout tokens

| Token                                   | Default | Description                              |
| --------------------------------------- | ------- | ---------------------------------------- |
| `--cds-aichat-launcher-default-size`    | `56px`  | Default launcher button size             |
| `--cds-aichat-launcher-position-bottom` | `48px`  | Distance from the bottom of the viewport |
| `--cds-aichat-launcher-position-right`  | `32px`  | Distance from the right of the viewport  |
| `--cds-aichat-launcher-extended-width`  | `280px` | Extended launcher width                  |

##### Launcher color tokens

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

##### Unread indicator tokens

| Token                                            | Default          | Description             |
| ------------------------------------------------ | ---------------- | ----------------------- |
| `--cds-aichat-unread-indicator-color-background` | `$support-error` | Unread badge background |
| `--cds-aichat-unread-indicator-color-text`       | `$text-on-color` | Unread badge text       |

#### Header

The Carbon AI Chat header can be configured to add an overflow menu, update icons, add title text and more.

For more information, see the documentation for {@link PublicConfig.header}.

#### Launcher

The Carbon AI Chat launcher welcomes and engages customers so they know where to find help if they need it. You can also provide your own launcher.

For more information, see the documentation for {@link PublicConfig.launcher}.

#### Homescreen

The Carbon AI Chat displays an optional home screen featuring content presented to users during their initial interaction and accessible later in the conversation. Many use it to provide sample prompts for their assistant, but there is considerable freedom on this page to introduce your particular assistant.

For more information, see the documentation for {@link PublicConfig.homescreen}.

#### Writeable elements (slotted content)

The Carbon AI Chat strategically provides access to various slots around the Carbon AI Chat. You can directly write to them as portals from your application with frameworks like React, Angular, Vue, or a web component. The writeable elements available are defined at {@link WriteableElementName}.

**Using the rounded modifier system with writeable elements:**

Slotted content can use `data-rounded` and `data-stacked` attributes to align with the chat's corner rounding. This is especially useful for footer actions, custom headers, or any content that should visually integrate with the chat shell.

Example (footer writeable element):

```ts
import { WriteableElementName } from "@carbon/ai-chat";

const footer = instance.writeableElements[WriteableElementName.FOOTER_ELEMENT];
if (footer) {
  footer.innerHTML = `
    <div class="my-footer-actions" data-rounded="bottom" data-stacked>
      <button type="button">Cancel</button>
      <button type="button">Save</button>
    </div>
  `;
}
```

The `data-rounded="bottom"` attribute ensures the footer content inherits the correct bottom corner rounding, and `data-stacked` indicates the buttons are arranged vertically. See the [Rounded modifier system](#rounded-modifier-system-data-rounded--data-stacked) section for more details.

For more information, see the documentation for [React](React.md) and [web components](WebComponent.md).

#### Custom panels

The Carbon AI Chat can open an overlay panel with custom content at any time. Panels are effective for use cases that range from pre-chat content forms, post-chat feedback forms, or multi-step processes. You can open the panel at any time, whether from an event, a `user_defined` response, or even an action a user takes on your website.

Determine whether the panel should function as a secondary view that users can dismiss quickly, or as a primary interface that temporarily takes over the chat. When `hideBackButton` is left `false` (the default), the main chat header stays visible and a secondary panel header with its own back button and title is shown; this mode is best for flows when a user is drilling in to deeper detail in a conversation or for interactions that can dismiss.

When you set `hideBackButton` to `true`, your panel does not get a secondary header. This mode is useful if you have an action the user must complete to continue.

Custom panels are controlled via {@link ChatInstance.customPanels}. Use `instance.customPanels.getPanel(PanelType.DEFAULT)` to obtain the default panel, then call `open(options)` and `close()` as needed. The default panel overlays the chat content window. Supported options are described by {@link DefaultCustomPanelConfigOptions}.

Example:

```ts
import { PanelType } from "@carbon/ai-chat";

const panel = instance.customPanels.getPanel(PanelType.DEFAULT);
panel.open({
  title: "Interesting extra data",
  // Keep the assistant header/back button visible
  hideBackButton: false,
});
```

```ts
panel.open({
  // Full-screen takeover
  hideBackButton: true,
  title: "Required form",
});

// ...later
// While the back button will automatically close the panel, if you hide the back button, it is up to you to know when to close the panel!
panel.close();
```

The custom panel renders content through the {@link WriteableElementName.CUSTOM_PANEL_ELEMENT} writeable element. For more on rendering writeable elements, see the documentation for [React](React.md) and [web components](WebComponent.md).

**Using the rounded modifier system with custom panels:**

Custom panel content can use `data-rounded` attributes to align with the panel's corner rounding. This helps your custom content integrate seamlessly with the panel's visual design.

```ts
const panelElement =
  instance.writeableElements[WriteableElementName.CUSTOM_PANEL_ELEMENT];
if (panelElement) {
  panelElement.innerHTML = `
    <div class="my-panel-content">
      <div class="panel-section" data-rounded="top">
        <h3>Form Title</h3>
      </div>
      <div class="panel-section">
        <input type="text" placeholder="Enter data" />
      </div>
      <div class="panel-actions" data-rounded="bottom" data-stacked>
        <button type="button">Cancel</button>
        <button type="button">Submit</button>
      </div>
    </div>
  `;
}
```

See the [Rounded modifier system](#rounded-modifier-system-data-rounded--data-stacked) section for more details on using these attributes.

### Content and responses

#### Customizing responses from the assistant

The Carbon AI Chat can accept many `response_types` like carousels, buttons, etc. You can navigate to the properties for each `response_type` by visiting the base {@link GenericItem} type.

##### Rich text responses

The Carbon AI Chat supports styling inside `text` responses to match the theme of your Carbon AI Chat, both with Markdown or HTML content returned from your assistant. For more information on supported Markdown syntax and HTML content handling, see the documentation for {@link TextItem}.

##### User-defined responses

In addition to rendering HTML content in responses, the Carbon AI Chat can render content from your own HTML, CSS, or JavaScript on your page by using a `user_defined` {@link UserDefinedItem}. It allows for a better authoring experience for development and enables you to change responses without editing your assistant. You can even use portals in advanced frameworks like React to render content from your main application.

To show custom content, you return the following from your server. Refer to the following example (a user-defined card).

```json
{
  "response_type": "user_defined",
  "user_defined": {
    // A unique name for each UI component.
    "type": "promo-card",
    "title": "Upgrade to Pro",
    "description": "Unlock higher limits and priority support.",
    "primaryLabel": "Upgrade"
  }
}
```

The `user_defined` response injects into a slot within the Carbon AI Chat's shadow DOM. This means that it can be styled from global CSS and have a small amount of the CSS inherited from the Carbon AI Chat (font styling, and so on) styles. You can use Carbon components in addition to your own custom components.

Example render for the `promo-card` response:

```html
<cds-aichat-card>
  <div slot="card-body">
    <h4>Upgrade to Pro</h4>
    <p>Unlock higher limits and priority support.</p>
  </div>
  <cds-aichat-card-footer slot="card-footer">
    <cds-aichat-button>Upgrade</cds-aichat-button>
  </cds-aichat-card-footer>
</cds-aichat-card>
```

When streaming `user_defined` responses, the API only supports sending chunks of strings, not partially completed JSON. You can stringify JSON and then have your user defined handler that responds to it deal with try/catch based parsing or an optimistic parsing library. If you are streaming via `addMessageChunk`, be sure to include `streaming_metadata.response_id` for the message and `streaming_metadata.id` for each item so chunks correlate correctly.

For more information, see the documentation for [React](React.md) and [web components](WebComponent.md).

#### Rounded modifier system (data-rounded / data-stacked)

AI Chat components use a shared rounded modifier system to keep corners consistent across slotted content. There are two ways to use it:

1. Read the rounded modifier tokens in your own CSS.
2. Add `data-rounded` (and `data-stacked` when needed) so the system applies rounding for you.

You must add `data-rounded` / `data-stacked` to your own slotted content. We only add these attributes inside built-in components.

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

Use `data-stacked` when children are arranged in a vertical stack. Without `data-stacked`, `data-rounded="top"` and `data-rounded="bottom"` will round the first and last child in a horizontal row.

##### Per-Corner Configuration

You can configure corners individually using the `layout.corners` property:

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

**Partial configuration (unspecified corners default to SQUARE):**

```typescript
{
  layout: {
    corners: {
      startStart: CornersType.ROUND,
      startEnd: CornersType.ROUND
      // endStart and endEnd will default to SQUARE
    }
  }
}
```

> **Note:** Corner names use CSS logical properties for RTL support. `startStart` means "block-start inline-start" which automatically maps to the correct physical corner based on text direction.

##### CSS custom properties

**Individual corner properties (RTL-safe):**

- `--cds-aichat-border-radius-start-start` (default: `layout.$spacing-03` / `0.5rem` / `8px`)
- `--cds-aichat-border-radius-start-end` (default: `layout.$spacing-03` / `0.5rem` / `8px`)
- `--cds-aichat-border-radius-end-start` (default: `layout.$spacing-03` / `0.5rem` / `8px`)
- `--cds-aichat-border-radius-end-end` (default: `layout.$spacing-03` / `0.5rem` / `8px`)

**Using CSS custom properties in your own styles:**

```css
/* BEFORE (deprecated) */
.my-custom-surface {
  border-radius: var(--cds-aichat-border-radius);
}

/* AFTER (recommended) */
.my-custom-surface {
  border-start-start-radius: var(--cds-aichat-border-radius-start-start, 0);
  border-start-end-radius: var(--cds-aichat-border-radius-start-end, 0);
  border-end-start-radius: var(--cds-aichat-border-radius-end-start, 0);
  border-end-end-radius: var(--cds-aichat-border-radius-end-end, 0);
}
```

Example (footer writeable element with stacked actions):

```html
<div class="my-footer-actions" data-rounded="bottom" data-stacked>
  <button type="button">Cancel</button>
  <button type="button">Save</button>
</div>
```

Render this into the footer writeable element so it inherits the correct rounding for the current layout.

Example (custom CSS using tokens):

```css
.my-custom-surface {
  border-radius: var(--cds-aichat-border-radius);
}

.my-custom-card {
  /* Only round top corners */
  border-start-start-radius: var(--cds-aichat-border-radius-start-start);
  border-start-end-radius: var(--cds-aichat-border-radius-start-end);
}
```

### Config reference

For other configuration options (assistant name, feedback persistence, and more), see the {@link PublicConfig} documentation.
