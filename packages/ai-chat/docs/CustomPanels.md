---
title: Custom panels
---

### Overview

Open an overlay panel with your own content — for pre-chat forms, post-chat feedback, or multi-step flows — at any time.

### Opening a panel

Use a panel for pre-chat forms, post-chat feedback, or multi-step flows. You can open it from an event, a `user_defined` response, or an action a user takes on your website.

Decide whether the panel acts as a secondary view users can dismiss quickly, or a primary interface that temporarily takes over the chat. When {@link DefaultCustomPanelConfigOptions.hideBackButton} is `false` (the default), the main chat header stays visible and the panel gets its own header with a back button and title. Use this mode when a user drills into more detail or can dismiss the panel.

When you set `hideBackButton` to `true`, your panel does not get a secondary header. Use this mode when the user must complete an action to continue.

Control custom panels through {@link ChatInstance.customPanels}. Use {@link CustomPanels.getPanel} with {@link PanelType} to get the default panel, then call {@link CustomPanelInstance.open} and {@link CustomPanelInstance.close} as needed. The default panel overlays the chat content window, and {@link DefaultCustomPanelConfigOptions} describes its options.

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
// The back button closes the panel automatically. If you hide it, you must close the panel yourself.
panel.close();
```

The custom panel renders content through the {@link WriteableElementName.CUSTOM_PANEL_ELEMENT} slot. See [Slots](./WriteableElements.md) for how to render into a slot.

#### Align rounded corners in a panel

Custom panel content can use `data-rounded` attributes to align with the panel's corner rounding.

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

See [Rounded corners](./Layout.md#rounded-corners).

### Related

- [Slots](./WriteableElements.md) — the {@link WriteableElementName.CUSTOM_PANEL_ELEMENT} slot a panel renders through.
- [Layout](./Layout.md) — corner-rounding tokens used by `data-rounded`.
- [Using with React](./React.md) — get the {@link ChatInstance} in a React app.
- [Using as a Web component](./WebComponent.md) — get the {@link ChatInstance} with the web component.
