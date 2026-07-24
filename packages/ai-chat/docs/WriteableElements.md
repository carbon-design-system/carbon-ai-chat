---
title: Slots
---

## Overview

Render your own content in slots throughout the chat, including the chat footer, the space above the prompt line, and panel content.

## Writing to a slot

Write to slots as portals from your application, using frameworks such as [React](./React.md), [Angular](./Angular.md), Vue, or [web components](./WebComponent.md). For a list of the available slots, see {@link WriteableElementName | the slot list}. Access slots through {@link ChatInstance.writeableElements}.

Some slots are layout-specific: {@link WriteableElementName.PROMPT_LINE_ACTIONS_END | the prompt-line actions slot} renders only when the input uses the expanded layout ({@link InputConfig.expanded}), and the default (compact) layout hides any content written to it.

### Align rounded corners

Slotted content can use the `data-rounded` and `data-stacked` attributes to align with the chat's corner rounding, which is especially useful for footer actions, custom headers, or any content that integrates with the chat shell.

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

`data-rounded="bottom"` inherits the bottom corner rounding, and `data-stacked` stacks the buttons vertically. See [Rounded corners](./Layout.md#rounded-corners).

## Related

- [Custom panels](./CustomPanels.md) — render your own content in an overlay panel through {@link WriteableElementName.CUSTOM_PANEL_ELEMENT | the custom panel slot}.
- [Layout](./Layout.md) — corner-rounding tokens used by `data-rounded`.
- [Using with React](./React.md) — get the {@link ChatInstance} and render slots in a React app.
- [Using as a Web component](./WebComponent.md) — get the {@link ChatInstance} and render slots with the web component.
