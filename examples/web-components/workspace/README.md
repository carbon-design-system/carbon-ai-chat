# Workspace

Demonstrates the workspace panel feature: chat messages can open rich side-by-side content (inventory report, inventory status, outstanding orders, SQL editor) in a dedicated `workspacePanelElement` slot.

## What this example shows

- Mounting `cds-aichat-custom-element` full-screen with `showFrame: false` and a chat-messages max-width.
- Subscribing to `WORKSPACE_PRE_OPEN`, `WORKSPACE_OPEN`, and `WORKSPACE_CLOSE` bus events to track the active workspace.
- Rendering one of four Lit workspace views into the `workspacePanelElement` slot based on `additionalData.type`.
- Using `renderUserDefinedResponse` to inject an `<outstanding-orders-card>` whose "maximize" action opens the workspace via `instance.customPanels.getPanel(PanelType.WORKSPACE).open(...)`.

## When to use this pattern

- Assistants that need to open full-size artifacts (dashboards, reports, editors) alongside the chat.
- Custom-element hosts that control chat sizing and want inline workspace content without a separate launcher layout.

## APIs and props demonstrated

| Symbol                            | Kind           | Role in this example                                       |
| --------------------------------- | -------------- | ---------------------------------------------------------- |
| `<cds-aichat-custom-element>`     | custom element | Full-screen chat host.                                     |
| `slot="workspacePanelElement"`    | slot           | Receives the rendered workspace view.                      |
| `messaging.customSendMessage`     | property       | Mock backend.                                              |
| `layout.showFrame`                | property       | Disables the frame chrome.                                 |
| `layout.customProperties`         | property       | Passes `messages-max-width`.                               |
| `openChatByDefault`               | property       | Opens the chat on load.                                    |
| `onBeforeRender`                  | property       | Captures the `ChatInstance` and subscribes to events.      |
| `renderUserDefinedResponse`       | property       | Renders the `outstanding_orders_card`.                     |
| `instance.on`                     | method         | Subscribes to STATE_CHANGE and workspace events.           |
| `instance.getState`               | method         | Reads initial `activeResponseId`.                          |
| `instance.customPanels.getPanel`  | method         | Retrieves the workspace panel handle.                      |
| `panel.open`                      | method         | Opens the workspace with `workspaceId`/`additionalData`.   |
| `BusEventType.STATE_CHANGE`       | enum           | Tracks `activeResponseId`.                                 |
| `BusEventType.WORKSPACE_PRE_OPEN` | enum           | Pre-open lifecycle hook.                                   |
| `BusEventType.WORKSPACE_OPEN`     | enum           | Workspace opened; extracts `workspaceId`/`additionalData`. |
| `BusEventType.WORKSPACE_CLOSE`    | enum           | Workspace closed; clears state.                            |
| `PanelType.WORKSPACE`             | enum           | Panel key for `customPanels.getPanel`.                     |
| `RenderUserDefinedState`          | type           | Argument to the render callback.                           |
| `UserDefinedItem`                 | type           | Shape of user-defined message items.                       |
| `ChatInstance`                    | type           | Type of the instance handle.                               |
| `PublicConfig`                    | type           | Types the chat configuration object.                       |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-workspace
```

See [../README.md](../README.md) for the full setup walkthrough.
