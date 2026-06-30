# Feedback

Lit example that subscribes to `BusEventType.FEEDBACK` and forwards `FeedbackInteractionType.SUBMITTED` events to the host page.

## What this example shows

- Mounting `<cds-aichat-custom-element>`.
- Subscribing to `BusEventType.FEEDBACK` from inside `onBeforeRender`.
- Detecting `FeedbackInteractionType.SUBMITTED` and surfacing the payload to the host (a `window.alert` stand-in for a telemetry call).
- Configuring `message_item_options.feedback` on a server response so the chat renders the thumbs-up/thumbs-down widget.

## When to use this pattern

- You need to capture user feedback on individual messages and forward it to your own backend or telemetry pipeline.
- You want a minimal reference for the `FEEDBACK` bus event independent of other concerns (state changes, user-defined responses).

## APIs and props demonstrated

| Symbol                                | Kind                   | Role in this example                                                |
| ------------------------------------- | ---------------------- | ------------------------------------------------------------------- |
| `<cds-aichat-custom-element>`         | custom element         | Mounts the chat as a fullscreen surface.                            |
| `PublicConfig.layout.showFrame`       | config prop            | Disables the default frame so the host element fills its container. |
| `PublicConfig.openChatByDefault`      | config prop            | Opens the chat on first paint.                                      |
| `messaging.customSendMessage`         | config prop            | Mock backend that emits a response with `message_item_options`.     |
| `onBeforeRender`                      | property               | Captures the `ChatInstance` and subscribes the feedback handler.    |
| `BusEventType.FEEDBACK`               | `@carbon/ai-chat` enum | Bus event fired when the user interacts with the feedback widget.   |
| `FeedbackInteractionType.SUBMITTED`   | `@carbon/ai-chat` enum | Discriminator for "user clicked submit on the feedback prompt."     |
| `instance.on`                         | instance method        | Subscribes the feedback handler.                                    |
| `message_item_options.feedback.is_on` | server response option | Renders the thumbs-up/thumbs-down widget on a message.              |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-feedback
```

See [../README.md](../README.md) for the full setup walkthrough.
