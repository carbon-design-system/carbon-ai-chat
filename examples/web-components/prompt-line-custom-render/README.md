# Prompt line / Custom render

The chat sits in a docked sidebar while the page body holds a grid of clickable Carbon tiles. Clicking a tile clears the chat input, injects a copy of the tile as a custom Tiptap node, and attaches the tile to the message's structured data; on send the tile is rendered inside the message bubble.

## What this example shows

- Registering a host-authored Tiptap node on the chat input via `PublicConfig.input.tiptap.extensions` — its node view renders a Carbon `<cds-tile>`.
- Bridging a node view's content into the page's light DOM with `renderInLightDom`, so the self-styled `<cds-tile>` displays correctly even though the editor runs inside the chat's shadow root.
- Driving the input from outside the chat with `instance.input.updateContent` — a single fresh document atomically clears the previous tile and injects the clicked one.
- Replacing the pending structured data with `instance.input.updateStructuredData`, using the `user_defined` escape hatch, so only the most recently clicked tile rides along with the next send.
- Rendering the custom node inside the sent user message bubble with `renderUserDefinedInputNode`, which the chat routes for any node type it does not recognize.
- Reading the tile back out of `request.input.structured_data.user_defined` in `customSendMessage` and echoing which tile was submitted.

## When to use this pattern

- Your host page has affordances (tiles, cards, menu items) that should compose a structured message rather than free-form text.
- You want a picked item to appear as a rich, host-styled component in the input and in the sent bubble, not as plain text.
- You need a sidecar (`structured_data`) describing the user's selection alongside — or instead of — the message text.

## APIs and props demonstrated

| Symbol                                | Kind                | Role in this example                                                         |
| ------------------------------------- | ------------------- | ---------------------------------------------------------------------------- |
| `<cds-aichat-custom-element>`         | custom element      | Mounts the chat UI inside the docked sidebar container.                      |
| `<cds-clickable-tile>` / `<cds-tile>` | custom element      | Carbon tiles — the page grid, and the tile injected into the input / bubble. |
| `PublicConfig`                        | type                | Types the config bound to the element's properties.                          |
| `ChatInstance`                        | type                | Captured in `.onBeforeRender` so the tile handler can drive the input.       |
| `WCRenderUserDefinedInputNode`        | type                | Types the `renderUserDefinedInputNode` callback.                             |
| `Extension`                           | `@tiptap/core` type | Types the custom Tiptap node registered on the input.                        |
| `renderInLightDom`                    | helper              | Bridges the node view's `<cds-tile>` into the page's light DOM.              |
| `.renderUserDefinedInputNode`         | property            | Renders the custom `tileChip` node inside the sent user message bubble.      |
| `.input` (`input.tiptap.extensions`)  | property            | Registers the host-authored `tileChip` Tiptap node on the input.             |
| `instance.input.updateContent`        | method              | Clears the input and injects the clicked tile as a custom node.              |
| `instance.input.updateStructuredData` | method              | Replaces the pending structured data with metadata describing the tile.      |
| `.onBeforeRender`                     | property            | Captures the `ChatInstance` used by the tile-click handler.                  |
| `.layout` (`layout.showFrame`)        | property            | Hides the default frame so the chat fills the sidebar.                       |
| `.openChatByDefault`                  | property            | Mounts straight into the conversation, no launcher.                          |
| `.messaging.customSendMessage`        | property            | Reads `request.input.structured_data` and echoes the submitted tile.         |
| `Node.create`                         | `@tiptap/core` API  | Authors the custom `tileChip` inline atom node.                              |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-prompt-line-custom-render
```

See [../README.md](../README.md) for the full setup walkthrough.
