# Upsert message user defined

Updates one `user_defined` steps card with `ChatInstance.messaging.upsertMessage`. You can stop a run and start again. When a run finishes, a Carbon toast links to its message with `instance.scrollToMessage`.

## What this example shows

- Keep a steps card `MessageState.STREAMING` while work runs. Mark it `COMPLETE` when all steps finish.
- Use `CustomSendMessageOptions.signal` to stop pending updates. You can then start a fresh run.
- Keep the same widget on screen as its data changes, so updates preserve focus.
- Run several cards at once, each with its own message ID. Press Enter to send while a run is active.
- Use the toast's "View message" action to scroll back to a finished card.

## When to use this pattern

- Your reply has a card, chart, or progress tracker whose data changes over time.
- You want the user to keep typing while work runs in the background.
- You want to link to a finished reply from a toast outside the chat.

## APIs and props demonstrated

| Symbol | Kind | Role in this example |
| --- | --- | --- |
| `<cds-aichat-custom-element>` | custom element | Mounts the chat in your page. |
| `.messaging` / `.layout` / `.openChatByDefault` | properties | Sets the chat config. |
| `.onBeforeRender` | property (callback) | Keeps the chat instance for the toast action. |
| `.renderUserDefinedResponse` | property (callback) | Updates the same card element on each upsert. |
| `messaging.customSendMessage` | config prop | Starts the task when the user sends the trigger text. |
| `messaging.upsertMessage` | `ChatInstance` method | Adds the card and updates its steps. |
| `MessageState.STREAMING` / `MessageState.COMPLETE` | `@carbon/ai-chat` enum | Shows Stop while work runs. Completes the reply on success. |
| `CustomSendMessageOptions.signal` | `@carbon/ai-chat` type property | Ends pending waits and skips later writes after Stop. |
| `MessageResponseTypes.BUTTON` / `ButtonItemType.POST_BACK` | `@carbon/ai-chat` enums | Sends the trigger text to start a run. |
| `MessageResponseTypes.USER_DEFINED` | `@carbon/ai-chat` enum | Holds the card data for each update. |
| `instance.scrollToMessage` | `ChatInstance` method | Scrolls to the finished reply from the toast. |
| `layout.showFrame` | config prop | Hides the built-in frame. |
| `<cds-aichat-card>` / `<cds-aichat-card-steps>` / `<cds-aichat-card-footer>` | custom elements | Builds the steps card. |
| `<cds-actionable-notification>` / `<cds-actionable-notification-button>` | custom elements | Shows a toast with a link to the finished reply. |

## Run it

**Build the core packages first.** This example reads the built files from `@carbon/ai-chat-components` and `@carbon/ai-chat`. Rebuild them after changes under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-upsert-message-user-defined
```

See [../README.md](../README.md) for the full setup walkthrough.
