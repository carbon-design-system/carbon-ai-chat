# Input / Mentions & commands (custom render)

The Mentions & Commands example with a `renderCustomToken` supplied for mentions: each picked user appears in the input as a `<cds-definition-tooltip>` that shows the user's description on hover. Commands keep the default chip rendering.

## What this example shows

- Replacing the default mention chip with a custom inline element via `renderCustomToken`, returning a `<cds-definition-tooltip>` wrapped in an inline-block span.
- Mixing custom and default token rendering in one config — only the mention entry sets `renderCustomToken`, so commands fall back to the built-in chip.
- Imperatively constructing the token element from the suggestion item data inside the renderer.
- Persisting selections via `instance.input.updateStructuredData` (same flow as the non-custom example) so the custom rendering does not change the structured-data wire format.

## When to use this pattern

- You need richer in-input affordances for mentions (avatars, tooltips, status badges) than the default chip provides.
- Your design system already has a token/chip primitive (Carbon's `<cds-definition-tooltip>`, in this example) that you want to reuse.
- You want to customize one suggestion type's rendering while leaving others on the default chip.

## APIs and props demonstrated

| Symbol                                | Kind           | Role in this example                                                     |
| ------------------------------------- | -------------- | ------------------------------------------------------------------------ |
| `<cds-aichat-custom-element>`         | custom element | Mounts the chat UI at the fullscreen baseline.                           |
| `<cds-definition-tooltip>`            | custom element | Carbon component used inside the custom token renderer.                  |
| `PublicConfig`                        | type           | Types the config bound to the element's properties.                      |
| `ChatInstance`                        | type           | Captured in `onBeforeRender` so `onSelect` can update structured data.   |
| `SuggestionItem`                      | type           | Shape of each entry; passed to `renderCustomToken`.                      |
| `SuggestionType.MENTION`              | enum           | Selects the mention suggestion behavior.                                 |
| `SuggestionType.COMMAND`              | enum           | Selects the command suggestion behavior.                                 |
| `.input` (`input.suggestions`)        | property       | Registers two suggestion configurations on the input.                    |
| `suggestion.renderCustomToken`        | property       | Returns an `HTMLElement` rendered in place of the default chip.          |
| `suggestion.trigger`                  | property       | Character (`@` or `/`) that opens the suggestion list.                   |
| `suggestion.triggerPosition`          | property       | `"start"` constrains commands to the beginning of the line.              |
| `suggestion.items`                    | property       | Async filter narrowing items as the user types.                          |
| `suggestion.onSelect`                 | property       | Hook that runs when the user picks a suggestion.                         |
| `.onBeforeRender`                     | property       | Captures the `ChatInstance` ref used in `onSelect`.                      |
| `instance.input.updateStructuredData` | method         | Appends mention/command picks to the outgoing message's structured data. |
| `.layout` (`layout.showFrame`)        | property       | Hides the default frame so the chat fills the host.                      |
| `.openChatByDefault`                  | property       | Mounts straight into the conversation, no launcher.                      |
| `.messaging.customSendMessage`        | property       | Reads `request.input.structured_data` and echoes the picks.              |
| `.injectCarbonTheme`                  | property       | Applies the white Carbon theme.                                          |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-input-mentions-and-commands-custom-render
```

See [../README.md](../README.md) for the full setup walkthrough.
