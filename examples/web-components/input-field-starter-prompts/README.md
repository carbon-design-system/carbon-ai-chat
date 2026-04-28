# Input Field Starter Prompts

`<cds-aichat-container>` configured with a `STARTER` suggestion config: a curated list of prompt seeds that surface when the input is empty and focused. Picking one drops its value into the input so the user can edit and send.

## What this example shows

- Registering a `SuggestionType.STARTER` entry on `input.suggestions` so prompts appear when the input gains focus with no text typed.
- Providing an `items` resolver that returns the curated `STARTER_PROMPTS` list — each entry's `value` is what lands in the input on click; `label` and `description` are what the user sees.
- Letting the starter list close automatically once the user types, so it doesn't collide with normal sending.
- Subscribing to `BusEventType.SEND` via `instance.on(...)` to flip a flag that suppresses the starter list once the conversation is underway.
- Reusing the standard `customSendMessage` flow — the starter pick travels through the input as plain text, no special wire format.

## When to use this pattern

- You want to prime users with example utterances before they have typed anything, without taking over the home screen.
- You have a small, static list of high-value prompts that should be one-click reachable.
- You want the hint surface to live inside the input itself rather than as buttons above it (`HomeScreenConfig.starters`).

## APIs and props demonstrated

| Symbol                         | Kind           | Role in this example                                                              |
| ------------------------------ | -------------- | --------------------------------------------------------------------------------- |
| `<cds-aichat-container>`       | custom element | Mounts the chat UI.                                                               |
| `PublicConfig`                 | type           | Types the config bound to the element's properties.                               |
| `ChatInstance`                 | type           | Captured in `onBeforeRender` so the example can subscribe to events.              |
| `SuggestionItem`               | type           | Shape of each entry in the starter list.                                          |
| `SuggestionType.STARTER`       | enum           | Selects the focus-empty starter behavior.                                         |
| `BusEventType.SEND`            | enum           | Fired after the user sends a message; used to disable starters.                   |
| `.input` (`input.suggestions`) | property       | Registers one suggestion configuration on the input.                              |
| `suggestion.items`             | property       | Async resolver returning the starter list (or `[]` once a message has been sent). |
| `.onBeforeRender`              | property       | Captures the `ChatInstance` so we can call `instance.on(...)`.                    |
| `instance.on`                  | method         | Subscribes a handler to `BusEventType.SEND`.                                      |
| `.messaging.customSendMessage` | property       | Echoes the picked starter (or any user-typed text) back as a chat message.        |
| `.injectCarbonTheme`           | property       | Applies the white Carbon theme.                                                   |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-input-field-starter-prompts
```

See [../README.md](../README.md) for the full setup walkthrough.
