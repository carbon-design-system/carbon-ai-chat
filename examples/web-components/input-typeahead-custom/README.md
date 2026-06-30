# Input / Typeahead (custom list)

`<cds-aichat-custom-element>` with `input.autocomplete` whose dropdown is replaced by a fully custom Lit element supplied through `renderCustomList`.

## What this example shows

- Replacing the built-in autocomplete dropdown with a custom Lit element via `autocomplete.renderCustomList`.
- Constructing the custom list imperatively in the renderer (`document.createElement`, set properties, attach callbacks) and returning the element instance.
- Wiring the custom list to the host editor through `items`, `query`, and the `onSelect` / `onDismiss` callbacks passed via `setCallbacks`.
- Driving keyboard navigation (Arrow Up/Down, Enter, Escape) from a `document` keydown listener registered in the element's `connectedCallback`.

## When to use this pattern

- The default autocomplete dropdown does not match your app's visual language and you need full control over markup and styling.
- You want to surface richer per-item content (icons, multiple description lines, badges) than the default chip layout supports.
- You need a custom keyboard or selection model alongside the standard typeahead behavior.

## APIs and props demonstrated

| Symbol                          | Kind           | Role in this example                                                            |
| ------------------------------- | -------------- | ------------------------------------------------------------------------------- |
| `<cds-aichat-custom-element>`   | custom element | Mounts the chat UI at the fullscreen baseline.                                  |
| `<custom-suggestion-list>`      | custom element | Lit element returned from `renderCustomList`.                                   |
| `PublicConfig`                  | type           | Types the config bound to the element's properties.                             |
| `SuggestionItem`                | type           | Shape of each entry returned from `items` and surfaced to `onSelect`.           |
| `CustomListProps`               | type           | Props (`items`, `query`, `onSelect`, `onDismiss`) given to the custom renderer. |
| `.input` (`input.autocomplete`) | property       | Registers the typeahead behavior on the input.                                  |
| `autocomplete.renderCustomList` | property       | Returns an `HTMLElement` that replaces the default dropdown.                    |
| `autocomplete.items`            | property       | Async filter providing entries to the custom list.                              |
| `autocomplete.debounceMs`       | property       | Coalesces keystrokes before calling `items`.                                    |
| `.layout` (`layout.showFrame`)  | property       | Hides the default frame so the chat fills the host.                             |
| `.openChatByDefault`            | property       | Mounts straight into the conversation, no launcher.                             |
| `.messaging.customSendMessage`  | property       | Mock backend echoing the user's message.                                        |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-input-typeahead-custom
```

See [../README.md](../README.md) for the full setup walkthrough.
