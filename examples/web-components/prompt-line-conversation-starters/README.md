# Prompt line / Conversation starters

`<cds-aichat-custom-element>` configured with `input.expanded` layout and `input.starters` so conversation-starter prompts appear immediately when the editor is focused and empty — no typing required. A `renderCustomList` callback creates a `<cds-aichat-autocomplete>` element with a "Prompt suggestions" header above the list. Selecting a starter inserts the text and auto-sends in one action.

## What this example shows

- Using `input.expanded: true` so the editor occupies its own full-width row and the action buttons render inline beneath it.
- Configuring `input.starters` so the suggestion list appears immediately when the editor is focused and empty — no typing required. Selecting a starter inserts the text and auto-sends in one action.
- Using `starters.renderCustomList` to imperatively create a `<cds-aichat-autocomplete>` element with a `headerConfig`, adding a "Prompt suggestions" title above the list. The send-arrow is hidden (`enableSendButton: false`) because auto-send already handles submission.
- Using `starters.isOn` to toggle the starters list on and off without removing the config — keeping the rich editor alive so re-enabling is instant.
- Configuring a single `input.actions` toggle button (Chat icon) that enables or disables the starters list. The action is disabled while the input has text because starters only trigger on an empty editor.
- Listening to the `cds-aichat-prompt-change` event via `onBeforeRender` to track whether the editor has any text.

## When to use this pattern

- You want conversation starters to appear in the prompt line immediately on focus, before the user types anything.
- Your chat surface uses the expanded layout (editor on its own row, actions row beneath).
- You need a labeled starter dropdown (e.g. "Prompt suggestions", "Recent queries") with a visible header.
- You want selecting a starter to send immediately rather than just inserting text into the editor.

## APIs and props demonstrated

| Symbol                        | Kind           | Role in this example                                                                 |
| ----------------------------- | -------------- | ------------------------------------------------------------------------------------ |
| `<cds-aichat-custom-element>` | custom element | Mounts the chat UI at the fullscreen baseline.                                       |
| `messaging.customSendMessage` | property       | Mock backend that echoes the user's message.                                         |
| `layout.showFrame`            | property       | Hides the default frame so the chat fills the host.                                  |
| `openChatByDefault`           | property       | Mounts straight into the conversation, no launcher.                                  |
| `input.expanded`              | property       | Switches the prompt line to the expanded (two-row) layout.                           |
| `input.starters`              | property       | Shows the starter list on empty-editor focus; auto-sends on selection.               |
| `starters.items`              | property       | Static list of conversation-starter prompts.                                         |
| `starters.renderCustomList`   | property       | Imperatively creates `<cds-aichat-autocomplete>` with a "Prompt suggestions" header. |
| `starters.isOn`               | property       | Toggles the starters list on/off without removing the config.                        |
| `input.actions`               | property       | Single toggle action that enables or disables the starters list.                     |
| `<cds-aichat-autocomplete>`   | custom element | Renders the starter dropdown with `headerConfig`.                                    |
| `onBeforeRender`              | property       | Subscribes to `cds-aichat-prompt-change` to track editor content.                    |
| `cds-aichat-prompt-change`    | event          | Fires when the editor content changes; used to disable the toggle when not empty.    |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-prompt-line-conversation-starters
```

See [../README.md](../README.md) for the full setup walkthrough.
