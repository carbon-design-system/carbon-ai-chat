# Mentions & Commands

`<cds-aichat-container>` configured with two suggestion entries: `@mentions` for picking team members anywhere in the message, and `/commands` constrained to the start of the line.

## What this example shows

- Configuring two suggestion entries on `input.suggestions`: a `MENTION` triggered by `@` and a `COMMAND` triggered by `/`.
- Restricting commands to the beginning of the line via `triggerPosition: "start"`.
- Showing all candidates immediately on trigger by supplying `initialItems`, then narrowing them as the user types via the async `items` filter.
- Persisting selected mentions and commands as `StructuredData` fields by calling `instance.input.updateStructuredData` inside `onSelect`.
- Reading `request.input.structured_data?.fields` in `customSendMessage` to surface which mentions and commands the user attached to the outgoing message.

## When to use this pattern

- You need `@mention` or `/command` syntax to attach structured selections (users, channels, slash actions) to outgoing messages.
- You want commands to be valid only at the start of a message but mentions to be valid anywhere.
- You need a reference for round-tripping suggestion picks into `request.input.structured_data` so a server can act on them.

## APIs and props demonstrated

| Symbol                                | Kind           | Role in this example                                                     |
| ------------------------------------- | -------------- | ------------------------------------------------------------------------ |
| `<cds-aichat-container>`              | custom element | Mounts the chat UI.                                                      |
| `PublicConfig`                        | type           | Types the config bound to the element's properties.                      |
| `ChatInstance`                        | type           | Captured in `onBeforeRender` so `onSelect` can update structured data.   |
| `SuggestionItem`                      | type           | Shape of each entry returned from `items`.                               |
| `SuggestionType.MENTION`              | enum           | Selects the mention suggestion behavior.                                 |
| `SuggestionType.COMMAND`              | enum           | Selects the command suggestion behavior.                                 |
| `.input` (`input.suggestions`)        | property       | Registers two suggestion configurations on the input.                    |
| `suggestion.trigger`                  | property       | Character (`@` or `/`) that opens the suggestion list.                   |
| `suggestion.triggerPosition`          | property       | `"start"` constrains commands to the beginning of the line.              |
| `suggestion.initialItems`             | property       | Items shown immediately on trigger before the user types.                |
| `suggestion.items`                    | property       | Async filter narrowing items as the user types.                          |
| `suggestion.onSelect`                 | property       | Hook that runs when the user picks a suggestion.                         |
| `.onBeforeRender`                     | property       | Captures the `ChatInstance` ref used in `onSelect`.                      |
| `instance.input.updateStructuredData` | method         | Appends mention/command picks to the outgoing message's structured data. |
| `.messaging.customSendMessage`        | property       | Reads `request.input.structured_data` and echoes the picks.              |
| `.injectCarbonTheme`                  | property       | Applies the white Carbon theme.                                          |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-mentions-and-commands
```

See [../README.md](../README.md) for the full setup walkthrough.
