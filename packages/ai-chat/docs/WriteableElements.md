---
title: Slots
---

## Overview

You may render custom content inside of various slots throughout the chat, such as the chat footer, above the prompt line, and panel content.

## Writing to a slot

Write to slots as portals from your application with frameworks such as [React](./React.md), [Angular](./Angular.md), Vue, or [web components](./WebComponent.md). See {@link WriteableElementName} for a list of available slots.

Access slots via {@link ChatInstance.writeableElements}.

### Align rounded corners

Slotted content can use `data-rounded` and `data-stacked` attributes to align with the chat's corner rounding. This is especially useful for footer actions, custom headers, or any content that integrates with the chat shell.

Example (footer slot):

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

`data-rounded="bottom"` inherits the bottom corner rounding; `data-stacked` arranges the buttons vertically. See [Rounded corners](./Layout.md#rounded-corners).

## Related

- [Custom panels](./CustomPanels.md) — render your own content in an overlay panel through {@link WriteableElementName.CUSTOM_PANEL_ELEMENT}.
- [Layout](./Layout.md) — corner-rounding tokens used by `data-rounded`.
- [Using with React](./React.md) — get the {@link ChatInstance} and render slots in a React app.
- [Using as a Web component](./WebComponent.md) — get the {@link ChatInstance} and render slots with the web component.
