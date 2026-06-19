# Upsert message user defined

Progressively updates a `user_defined` steps-card widget inside a single assistant message using `ChatInstance.messaging.upsertMessage`, and pops a Carbon toast (with a "View message" action wired to `instance.scrollToMessage`) when the run completes.

## What this example shows

- How to use `ChatInstance.messaging.upsertMessage` to mutate a message after it is already `MessageState.COMPLETE`, keeping the input usable throughout.
- How a user_defined widget rendered via `renderUserDefinedResponse` keeps its DOM identity across successive upserts (no remount), so internal animations and focus survive each update.
- How to run multiple long-running scenarios concurrently — each click of the welcome message's post-back button generates a fresh `messageID`, parallelized by the lifecycle coordinator.
- How to surface scenario completion outside the chat with a `<cds-actionable-notification>` whose action button calls `instance.scrollToMessage` to jump the conversation back to the finished message.

## When to use this pattern

- You have an assistant message that contains a stateful widget (a card, a chart, a progress tracker) whose data continues to change after the message is delivered.
- You want the user to keep typing while the widget updates in the background.
- You need an out-of-chat notification that lets the user jump back to the relevant message after they have scrolled away.

## APIs and props demonstrated

| Symbol                                                                       | Kind                    | Role in this example                                                              |
| ---------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------- |
| `<cds-aichat-custom-element>`                                                | custom element          | Mounts the chat into a host element you style.                                    |
| `.messaging` / `.layout` / `.openChatByDefault`                              | properties              | Top-level `PublicConfig` fields applied to the custom element.                    |
| `.onBeforeRender`                                                            | property (callback)     | Captures the `ChatInstance` for the toast action.                                 |
| `.renderUserDefinedResponse`                                                 | property (callback)     | Returns the steps-card `HTMLElement` on every upsert; same ref ⇒ in-place update. |
| `messaging.customSendMessage`                                                | config prop             | Mock back end: branches on the post-back trigger string and runs the long task.   |
| `messaging.upsertMessage`                                                    | `ChatInstance` method   | Inserts and progressively updates the steps-card message.                         |
| `MessageState.COMPLETE`                                                      | `@carbon/ai-chat` enum  | Marks the message complete on the very first upsert so input stays usable.        |
| `MessageResponseTypes.BUTTON` / `ButtonItemType.POST_BACK`                   | `@carbon/ai-chat` enums | Welcome-message button that posts the trigger string back to start a run.         |
| `MessageResponseTypes.USER_DEFINED`                                          | `@carbon/ai-chat` enum  | Payload carrying the steps-card data updated each upsert.                         |
| `instance.scrollToMessage`                                                   | `ChatInstance` method   | Toast action target — scrolls the chat back to the finished message.              |
| `layout.showFrame`                                                           | config prop             | Disables the built-in frame for the fullscreen baseline.                          |
| `<cds-aichat-card>` / `<cds-aichat-card-steps>` / `<cds-aichat-card-footer>` | custom elements         | Carbon storybook `WithSteps` composition rendered as the user_defined widget.     |
| `<cds-actionable-notification>` / `<cds-actionable-notification-button>`     | custom elements         | Out-of-chat completion toast with a built-in action button.                       |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-upsert-message-user-defined
```

See [../README.md](../README.md) for the full setup walkthrough.
