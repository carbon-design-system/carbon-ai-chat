# Input / Mentions & commands (custom render)

The Mentions & Commands example with a `renderCustomToken` supplied for mentions: each picked user appears in the input as a `<cds-tag>` wrapped in a `<cds-tooltip>` showing the user's description on hover. Commands keep the default chip rendering.

## What this example shows

- Replacing the default mention chip with a custom inline element via `mention.renderCustomToken`, returning a `<cds-tooltip>`-wrapped `<cds-tag>`.
- Mixing custom and default token rendering across the two slots — only `input.mention` sets `renderCustomToken`, so commands fall back to the built-in chip.
- Using `<cds-tooltip autoalign>` so the popover escapes the editor's `overflow: auto` clip via `position: fixed`. With `align="top"` we request placement above the chip; on this chat-input surface the popover currently flips to the side — a Carbon WC behavior difference from the React `Tooltip` tracked at [carbon-ai-chat#1449](https://github.com/carbon-design-system/carbon-ai-chat/issues/1449) (sub-issue of #731).
- Persisting selections via `instance.input.updateStructuredData` (same flow as the non-custom example) so the custom rendering does not change the structured-data wire format, with a symmetric `onRemove` that drops a chip's field when it is deleted before sending.

## When to use this pattern

- You need richer in-input affordances for mentions (avatars, tooltips, status badges) than the default chip provides.
- Your design system already has a token/chip primitive (Carbon's `<cds-tag>`, in this example) that you want to reuse.
- You want to customize one suggestion type's rendering while leaving others on the default chip.

## APIs and props demonstrated

| Symbol                                  | Kind           | Role in this example                                                     |
| --------------------------------------- | -------------- | ------------------------------------------------------------------------ |
| `<cds-aichat-custom-element>`           | custom element | Mounts the chat UI at the fullscreen baseline.                           |
| `<cds-tag>`                             | custom element | Visual chip used inside the custom token renderer.                       |
| `<cds-tooltip>`                         | custom element | Hover affordance wrapping the custom mention chip.                       |
| `PublicConfig`                          | type           | Types the config bound to the element's properties.                      |
| `ChatInstance`                          | type           | Captured in `onBeforeRender` so `onSelect` can update structured data.   |
| `SuggestionItem`                        | type           | Shape of each entry; passed to `renderCustomToken`.                      |
| `.input` (`input.mention`)              | property       | Registers the `@`-mention trigger config on the input.                   |
| `.input` (`input.command`)              | property       | Registers the `/`-command trigger config on the input.                   |
| `mention.renderCustomToken`             | property       | Returns an `HTMLElement` rendered in place of the default mention chip.  |
| `mention.trigger` / `command.trigger`   | property       | Character (`@` or `/`) that opens the suggestion list.                   |
| `command.triggerPosition`               | property       | `"start"` constrains commands to the beginning of the line.              |
| `mention.items` / `command.items`       | property       | Async filter (or static list) narrowing items as the user types.         |
| `mention.onSelect` / `command.onSelect` | property       | Hook that runs when the user picks a suggestion.                         |
| `mention.onRemove` / `command.onRemove` | property       | Mirror of `onSelect`, fired when a user deletes a chip from the input.   |
| `.onBeforeRender`                       | property       | Captures the `ChatInstance` ref used in `onSelect` / `onRemove`.         |
| `instance.input.updateStructuredData`   | method         | Adds and removes mention/command picks on the message's structured data. |
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

npm run start --workspace=@carbon/ai-chat-examples-web-components-input-mentions-and-commands-custom-render
```

See [../README.md](../README.md) for the full setup walkthrough.
