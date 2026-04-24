# Workspace

Renders custom content inside the built-in workspace panel of `ChatCustomElement`, driven by chat messages that include `PREVIEW_CARD` responses or user-defined cards with a "maximize" action.

## What this example shows

- Subscribing to `WORKSPACE_PRE_OPEN`, `WORKSPACE_OPEN`, and `WORKSPACE_CLOSE` bus events to track which workspace is active.
- Opening the workspace panel imperatively via `instance.customPanels.getPanel(PanelType.WORKSPACE).open(...)`.
- Emitting `MessageResponseTypes.PREVIEW_CARD` responses with `workspace_id` + `additional_data` to trigger the workspace.
- Emitting `USER_DEFINED` cards (`outstanding_orders_card`) with a custom `OutstandingOrdersCard` preview + maximize handler.
- Rendering different workspace bodies (inventory report, inventory status, outstanding orders, SQL editor) via `renderWriteableElements` keyed on `additionalData.type`.
- `ChatCustomElement` with `layout.showFrame: false` and `openChatByDefault: true`.

## When to use this pattern

- You want to show rich, app-scoped content (tables, editors, reports) alongside the chat without leaving the page.
- Your chat responses can carry a `workspace_id` and metadata pointing to an in-app view.

## APIs and props demonstrated

| Symbol                                                                          | Package / kind              | Role in this example                           |
| ------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------- |
| `ChatCustomElement`                                                             | `@carbon/ai-chat` component | Mounts the chat with custom host DOM.          |
| `PublicConfig`                                                                  | `@carbon/ai-chat` type      | Config shape.                                  |
| `ChatInstance`                                                                  | `@carbon/ai-chat` type      | Provided in `onBeforeRender`.                  |
| `BusEventType.WORKSPACE_PRE_OPEN` / `WORKSPACE_OPEN` / `WORKSPACE_CLOSE`        | `@carbon/ai-chat` enum      | Workspace lifecycle events.                    |
| `BusEventWorkspacePreOpen` / `BusEventWorkspaceOpen` / `BusEventWorkspaceClose` | `@carbon/ai-chat` types     | Typed event payloads.                          |
| `PanelType.WORKSPACE`                                                           | `@carbon/ai-chat` enum      | Selects the workspace panel.                   |
| `instance.customPanels.getPanel(...).open(...)`                                 | `ChatInstance` API          | Opens the workspace imperatively.              |
| `renderUserDefinedResponse`                                                     | prop                        | Renders the outstanding-orders preview card.   |
| `RenderUserDefinedState`                                                        | `@carbon/ai-chat` type      | Argument to the render callback.               |
| `writeableElements.workspacePanelElement`                                       | render slot                 | Where the workspace body is rendered.          |
| `MessageResponseTypes.PREVIEW_CARD` / `USER_DEFINED` / `OPTION` / `TEXT`        | `@carbon/ai-chat`           | Outgoing response types from the mock backend. |
| `OptionItemPreference.BUTTON`                                                   | `@carbon/ai-chat` enum      | Inventory-type picker.                         |
| `layout.showFrame` / `layout.customProperties`                                  | prop                        | Flush custom-element layout.                   |
| `openChatByDefault`                                                             | prop                        | Opens chat on load.                            |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-workspace
```

(Replace `start` with `dev` or `test` if this example's package.json defines those instead.)

See [../README.md](../README.md) for the full setup walkthrough.
