# Prompt line / Conversation starters

`ChatCustomElement` configured with `input.expanded` layout and `input.starters` so conversation-starter prompts appear immediately when the editor is focused and empty — no typing required. A `renderCustomList` wraps `CDSAIChatAutocomplete` to add a "Prompt suggestions" header above the list. Selecting a starter inserts the text and auto-sends in one action.

## What this example shows

- Using `input.expanded: true` so the editor occupies its own full-width row and the action buttons render inline beneath it.
- Configuring `input.starters` so the suggestion list appears immediately when the editor is focused and empty — no typing required. Selecting a starter inserts the text and auto-sends in one action.
- Using `starters.renderCustomList` to render `CDSAIChatAutocomplete` with a `headerConfig`, adding a "Prompt suggestions" title above the list. The send-arrow is hidden (`enableSendButton={false}`) because auto-send already handles submission.
- Configuring four dummy `input.actions` (Add, Download, Share, Settings) that each `alert()` when clicked.

## When to use this pattern

- You want conversation starters to appear in the prompt line immediately on focus, before the user types anything.
- Your chat surface uses the expanded layout (editor on its own row, actions row beneath).
- You need a labeled starter dropdown (e.g. "Prompt suggestions", "Recent queries") with a visible header.
- You want selecting a starter to send immediately rather than just inserting text into the editor.

## APIs and props demonstrated

| Symbol                        | Package / kind                         | Role in this example                                                                |
| ----------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------- |
| `ChatCustomElement`           | `@carbon/ai-chat` component            | Mounts the chat UI at the fullscreen baseline.                                      |
| `PublicConfig`                | `@carbon/ai-chat` type                 | Types the config object passed to `ChatCustomElement`.                              |
| `StartersConfig`              | `@carbon/ai-chat` type                 | Shape of the `input.starters` object (items + renderCustomList).                    |
| `CustomListProps`             | `@carbon/ai-chat` type                 | Props received by the `renderCustomList` callback.                                  |
| `input.expanded`              | config prop                            | Switches the prompt line to the expanded (two-row) layout.                          |
| `input.starters`              | config prop                            | Shows the starter list on empty-editor focus; auto-sends on selection.              |
| `starters.items`              | config prop                            | Static list of conversation-starter prompts.                                        |
| `starters.renderCustomList`   | config prop                            | Replaces the built-in list UI with one that includes a "Prompt suggestions" header. |
| `input.actions`               | config prop                            | Inline icon buttons rendered in the expanded actions row.                           |
| `CDSAIChatAutocomplete`       | `@carbon/ai-chat-components` component | Renders the starter dropdown with `headerConfig`.                                   |
| `layout.showFrame`            | config prop                            | Hides the default frame so the chat fills the host.                                 |
| `openChatByDefault`           | config prop                            | Mounts straight into the conversation, no launcher.                                 |
| `messaging.customSendMessage` | config prop                            | Mock backend echoing the user's message.                                            |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-prompt-line-conversation-starters
```

See [../README.md](../README.md) for the full setup walkthrough.
