# Workspace table markdown override

`ChatCustomElement` configured with `markdown.customRenderers.table` so every markdown table renders inside a `cds-aichat-card` with a `cds-aichat-toolbar` header. The toolbar carries a Carbon Maximize icon button that opens the workspace panel and renders the same data inside a full-size `Table` (the React wrapper for `cds-aichat-table`) whose pagination page size adapts to the workspace's height.

## What this example shows

- Replacing the default markdown table renderer with `customRenderers.table` and returning JSX that wraps the table in a Carbon card.
- Driving the card header with `<Toolbar slot="header" titleText="..." actions={[...]} />` so the maximize action renders as a `cds-icon-button` with a tooltip — right-aligned automatically by the toolbar layout.
- Calling `instance.customPanels.getPanel(PanelType.WORKSPACE).open(...)` to display the same data in a workspace panel.
- Rendering the workspace content through `renderWriteableElements.workspacePanelElement`. The workspace component sets the table's `defaultPageSize` to the row count, which suppresses the pagination bar — all rows render and the workspace shell body's `overflow: auto` provides the vertical scrollbar.
- Cleaning up workspace state on the `BusEventType.WORKSPACE_CLOSE` event so the next open starts fresh.

## When to use this pattern

- You want long markdown tables to surface as a compact inline preview, with a one-click "expand" into a richer Carbon DataTable for browsing.
- You need a starting point for any markdown element that should open into the workspace panel (charts, code editors, image galleries, etc.).
- You want pagination row count that adapts to its container size instead of being hard-coded.

## APIs and props demonstrated

| Symbol                                | Package / kind                     | Role in this example                                                            |
| ------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------- |
| `ChatCustomElement`                   | `@carbon/ai-chat` component        | Mounts the chat into a fullscreen host element.                                 |
| `PublicConfig`                        | `@carbon/ai-chat` type             | Types the config object passed to `ChatCustomElement`.                          |
| `ChatContainerPropsMarkdown`          | `@carbon/ai-chat` type             | Shape of the `markdown` prop.                                                   |
| `MarkdownRendererTableArgs`           | `@carbon/ai-chat` type             | Argument shape for the table renderer (`headers`, `rows`, `slotName`, …).       |
| `markdown.customRenderers.table`      | config prop                        | Replaces the default markdown table renderer with a card+toolbar JSX wrapper.   |
| `ChatInstance.customPanels`           | `@carbon/ai-chat` API              | Access to the chat's panel manager.                                             |
| `CustomPanels.getPanel`               | `@carbon/ai-chat` API              | Returns a `CustomPanelInstance` for the requested panel type.                   |
| `PanelType.WORKSPACE`                 | `@carbon/ai-chat` enum             | Selects the workspace panel.                                                    |
| `CustomPanelInstance.open` / `.close` | `@carbon/ai-chat` API              | Opens / closes the workspace; `open` takes `WorkspaceCustomPanelConfigOptions`. |
| `renderWriteableElements`             | `ChatCustomElement` prop           | Slot for rendering custom content into the workspace panel.                     |
| `BusEventType.WORKSPACE_CLOSE`        | `@carbon/ai-chat` event            | Fires when the panel closes — used to clear workspace state.                    |
| `Card` (`cds-aichat-card`)            | `@carbon/ai-chat-components` React | Wraps the inline table; `isFlush` removes the default padding.                  |
| `Toolbar` (`cds-aichat-toolbar`)      | `@carbon/ai-chat-components` React | Renders the card header with title + right-aligned actions.                     |
| `WorkspaceShell`, `Body`              | `@carbon/ai-chat-components` React | Standard workspace-panel chrome around the full-size table.                     |
| `Maximize`                            | `@carbon/icons-react`              | Icon for the toolbar's "Open in workspace" action.                              |
| `Table` (`cds-aichat-table`)          | `@carbon/ai-chat-components` React | Renders the full-size table inside the workspace.                               |
| `defaultPageSize`                     | `Table` prop                       | Set to the row count so the pagination bar is suppressed and all rows render.   |
| `messaging.customSendMessage`         | config prop                        | Mock backend that emits a 24-row order table.                                   |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-workspace-table-markdown-override
```

See [../README.md](../README.md) for the full setup walkthrough.
