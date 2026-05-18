# Input / Mentions & commands (custom render)

The Mentions & Commands example with a `renderCustomToken` supplied for mentions: each picked user appears in the input as a Carbon `Tag` wrapped in a `Tooltip` showing the user's description on hover. Commands keep the default chip rendering.

## What this example shows

- Replacing the default mention chip with a custom inline element via `mention.renderCustomToken`, returning a `Tooltip`-wrapped Carbon `Tag`.
- Mixing custom and default token rendering across the two slots — only `input.mention` sets `renderCustomToken`, so commands fall back to the built-in chip.
- Using Carbon React's `Tooltip` with `autoAlign` so the popover escapes the editor's scroll-overflow clipping by positioning relative to the viewport.
- Persisting selections via `instance.input.updateStructuredData` (same flow as the non-custom example) so the custom rendering does not change the structured-data wire format.

## When to use this pattern

- You need richer in-input affordances for mentions (avatars, tooltips, status badges) than the default chip provides.
- Your design system already has a token/chip primitive (Carbon `Tag`, in this example) that you want to reuse.
- You want to customize one suggestion type's rendering while leaving others on the default chip.

## APIs and props demonstrated

| Symbol                                  | Package / kind              | Role in this example                                                     |
| --------------------------------------- | --------------------------- | ------------------------------------------------------------------------ |
| `ChatCustomElement`                     | `@carbon/ai-chat` component | Mounts the chat UI at the fullscreen baseline.                           |
| `PublicConfig`                          | `@carbon/ai-chat` type      | Types the config object passed to `ChatCustomElement`.                   |
| `ChatInstance`                          | `@carbon/ai-chat` type      | Captured in `onBeforeRender` so `onSelect` can update structured data.   |
| `SuggestionItem`                        | `@carbon/ai-chat` type      | Shape of each entry; passed to `renderCustomToken`.                      |
| `input.mention`                         | config prop                 | Registers the `@`-mention trigger config on the input.                   |
| `input.command`                         | config prop                 | Registers the `/`-command trigger config on the input.                   |
| `mention.renderCustomToken`             | config prop                 | Returns a React node rendered in place of the default mention chip.      |
| `mention.trigger` / `command.trigger`   | config prop                 | Character (`@` or `/`) that opens the suggestion list.                   |
| `command.triggerPosition`               | config prop                 | `"start"` constrains commands to the beginning of the line.              |
| `mention.items` / `command.items`       | config prop                 | Async filter (or static list) narrowing items as the user types.         |
| `mention.onSelect` / `command.onSelect` | config prop                 | Hook that runs when the user picks a suggestion.                         |
| `Tag`                                   | `@carbon/react` component   | Visual chip used inside the custom token renderer.                       |
| `Tooltip`                               | `@carbon/react` component   | Hover affordance wrapping the custom mention chip.                       |
| `onBeforeRender`                        | component prop              | Captures the `ChatInstance` ref used in `onSelect`.                      |
| `instance.input.updateStructuredData`   | instance method             | Appends mention/command picks to the outgoing message's structured data. |
| `layout.showFrame`                      | config prop                 | Hides the default frame so the chat fills the host.                      |
| `openChatByDefault`                     | config prop                 | Mounts straight into the conversation, no launcher.                      |
| `messaging.customSendMessage`           | config prop                 | Reads `request.input.structured_data` and echoes the picks.              |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-input-mentions-and-commands-custom-render
```

See [../README.md](../README.md) for the full setup walkthrough.
