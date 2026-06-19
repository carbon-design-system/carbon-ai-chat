# Workspace table markdown override

`<cds-aichat-custom-element>` mounted directly in page light DOM and configured with `markdown.customRenderers.table` so every markdown table renders inside a `cds-aichat-card` with a `cds-aichat-toolbar` header. The toolbar carries a Carbon Maximize icon button that opens the workspace panel and renders the same data inside a full-size `<cds-aichat-table>` — the same component the chat uses by default for inline markdown tables, so the workspace view matches the inline preview.

## What this example shows

- Replacing the default markdown table renderer with `customRenderers.table` and returning a cached `HTMLElement` so streaming re-renders don't churn the DOM.
- Driving the card header with `<cds-aichat-toolbar>` and an `actions` property — the toolbar renders each action as a `cds-icon-button` with a tooltip, right-aligned automatically.
- Capturing the chat instance in `onBeforeRender` so the renderer can call `instance.customPanels.getPanel(PanelType.WORKSPACE).open(...)` on click.
- Assigning a Lit element (`<workspace-table-content>`) to `instance.writeableElements.workspacePanelElement`; the element renders `<cds-aichat-table>` inside a `<cds-aichat-workspace-shell>` so it fills the panel and gets a toolbar with a close action.
- Setting the table's `default-page-size` to the row count so the pagination bar is suppressed — all rows render and the workspace shell body's `overflow: auto` provides the vertical scrollbar.
- Cleaning up workspace content on the `BusEventType.WORKSPACE_CLOSE` event so the next open starts fresh.

## When to use this pattern

- You want long markdown tables to surface as a compact inline preview, with a one-click "expand" into a full-size Carbon table for browsing.
- You need a starting point for any markdown element that should open into the workspace panel (charts, code editors, image galleries, etc.).

## APIs and props demonstrated

| Symbol                                | Kind                          | Role in this example                                                            |
| ------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------- |
| `<cds-aichat-custom-element>`         | custom element                | Hosts the chat UI at the size of its CSS box.                                   |
| `.markdown`                           | property (`attribute: false`) | Carries the `customRenderers` object to the chat's renderer.                    |
| `WCMarkdown`                          | `@carbon/ai-chat` type        | Shape of the value bound to `.markdown`.                                        |
| `WCCustomMarkdownRenderers`           | `@carbon/ai-chat` type        | Shape of `markdown.customRenderers`.                                            |
| `markdown.customRenderers.table`      | config field                  | Replaces the default markdown table renderer with a card+toolbar HTMLElement.   |
| `MarkdownRendererTableArgs`           | `@carbon/ai-chat` type        | Argument shape for the table renderer (`headers`, `rows`, `slotName`, …).       |
| `ChatInstance.customPanels`           | `@carbon/ai-chat` API         | Access to the chat's panel manager.                                             |
| `CustomPanels.getPanel`               | `@carbon/ai-chat` API         | Returns a `CustomPanelInstance` for the requested panel type.                   |
| `PanelType.WORKSPACE`                 | `@carbon/ai-chat` enum        | Selects the workspace panel.                                                    |
| `CustomPanelInstance.open` / `.close` | `@carbon/ai-chat` API         | Opens / closes the workspace; `open` takes `WorkspaceCustomPanelConfigOptions`. |
| `ChatInstance.writeableElements`      | `@carbon/ai-chat` API         | Slot for assigning the workspace-panel HTMLElement content.                     |
| `BusEventType.WORKSPACE_CLOSE`        | `@carbon/ai-chat` event       | Fires when the panel closes — used to clear workspace state.                    |
| `<cds-aichat-card>` (`is-flush`)      | custom element                | Wraps the inline table; `is-flush` removes default padding.                     |
| `<cds-aichat-toolbar>`                | custom element                | Renders the card header with title + right-aligned actions.                     |
| `<cds-aichat-workspace-shell>` family | custom elements               | Standard workspace-panel chrome around the full-size table.                     |
| `Maximize16`                          | `@carbon/icons`               | Icon for the toolbar's "Open in workspace" action.                              |
| `<cds-aichat-table>`                  | `@carbon/ai-chat-components`  | Renders the full-size table inside the workspace.                               |
| `default-page-size`                   | `<cds-aichat-table>` property | Set to the row count so the pagination bar is suppressed and all rows render.   |
| `messaging.customSendMessage`         | property                      | Mock backend that emits a 24-row order table.                                   |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-workspace-table-markdown-override
```

See [../README.md](../README.md) for the full setup walkthrough.
