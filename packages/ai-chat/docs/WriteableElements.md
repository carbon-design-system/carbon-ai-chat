---
title: Slots
---

### Overview

Render your own content into slots around the chat — a custom footer, header, or panel content.

### Writing to a slot

Write your own content into slots around the chat. You write to them as portals from your application with frameworks such as React, Angular, Vue, or a web component. {@link WriteableElementName} lists the available slots.

These examples use the {@link ChatInstance} (`instance`); see [React](./React.md) or [web components](./WebComponent.md) for how to get it.

#### Align rounded corners

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

### Related

- [Custom panels](./CustomPanels.md) — render your own content in an overlay panel through {@link WriteableElementName.CUSTOM_PANEL_ELEMENT}.
- [Layout](./Layout.md) — corner-rounding tokens used by `data-rounded`.
- [Using with React](./React.md) — get the {@link ChatInstance} and render slots in a React app.
- [Using as a Web component](./WebComponent.md) — get the {@link ChatInstance} and render slots with the web component.
