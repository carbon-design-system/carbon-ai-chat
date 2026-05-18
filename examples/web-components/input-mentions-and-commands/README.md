# Input / Mentions & commands

`<cds-aichat-custom-element>` configured with `input.mention` for `@`-picking team members anywhere in the message and `input.command` for `/`-commands constrained to the start of the line.

## What this example shows

- Configuring two discrete suggestion slots on `InputConfig`: `input.mention` triggered by `@` and `input.command` triggered by `/`.
- Restricting commands to the beginning of the line via `command.triggerPosition: "start"`.
- Showing all candidates immediately on trigger and narrowing them as the user types via the async `items` filter (returning the full list when the query is empty).
- Persisting selected mentions and commands as `StructuredData` fields by calling `instance.input.updateStructuredData` inside `onSelect`.
- Reading `request.input.structured_data?.fields` in `customSendMessage` to surface which mentions and commands the user attached to the outgoing message.

## When to use this pattern

- You need `@mention` or `/command` syntax to attach structured selections (users, channels, slash actions) to outgoing messages.
- You want commands to be valid only at the start of a message but mentions to be valid anywhere.
- You need a reference for round-tripping suggestion picks into `request.input.structured_data` so a server can act on them.

## APIs and props demonstrated

| Symbol                                  | Kind           | Role in this example                                                     |
| --------------------------------------- | -------------- | ------------------------------------------------------------------------ |
| `<cds-aichat-custom-element>`           | custom element | Mounts the chat UI at the fullscreen baseline.                           |
| `PublicConfig`                          | type           | Types the config bound to the element's properties.                      |
| `ChatInstance`                          | type           | Captured in `onBeforeRender` so `onSelect` can update structured data.   |
| `SuggestionItem`                        | type           | Shape of each entry returned from `items`.                               |
| `.input` (`input.mention`)              | property       | Registers the `@`-mention trigger config on the input.                   |
| `.input` (`input.command`)              | property       | Registers the `/`-command trigger config on the input.                   |
| `mention.trigger` / `command.trigger`   | property       | Character (`@` or `/`) that opens the suggestion list.                   |
| `command.triggerPosition`               | property       | `"start"` constrains commands to the beginning of the line.              |
| `mention.items` / `command.items`       | property       | Async filter (or static list) narrowing items as the user types.         |
| `mention.onSelect` / `command.onSelect` | property       | Hook that runs when the user picks a suggestion.                         |
| `.onBeforeRender`                       | property       | Captures the `ChatInstance` ref used in `onSelect`.                      |
| `instance.input.updateStructuredData`   | method         | Appends mention/command picks to the outgoing message's structured data. |
| `.layout` (`layout.showFrame`)          | property       | Hides the default frame so the chat fills the host.                      |
| `.openChatByDefault`                    | property       | Mounts straight into the conversation, no launcher.                      |
| `.messaging.customSendMessage`          | property       | Reads `request.input.structured_data` and echoes the picks.              |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-input-mentions-and-commands
```

See [../README.md](../README.md) for the full setup walkthrough.
