# Typeahead (Custom List)

`ChatContainer` with an `AUTOCOMPLETE` suggestion whose dropdown is replaced by a fully custom React component supplied through `renderCustomList`.

## What this example shows

- Replacing the built-in autocomplete dropdown with a custom React component via `renderCustomList`.
- Wiring the custom list to the host editor through the `items`, `query`, `onSelect`, and `onDismiss` props passed to the renderer.
- Driving keyboard navigation (Arrow Up/Down, Enter, Escape) from a `document` keydown listener inside the custom list.
- Resetting the highlighted index whenever the items array changes so a new query starts from the top of the list.

## When to use this pattern

- The default autocomplete dropdown does not match your app's visual language and you need full control over markup and styling.
- You want to surface richer per-item content (icons, multiple description lines, badges) than the default chip layout supports.
- You need a custom keyboard or selection model alongside the standard typeahead behavior.

## APIs and props demonstrated

| Symbol                        | Package / kind              | Role in this example                                                            |
| ----------------------------- | --------------------------- | ------------------------------------------------------------------------------- |
| `ChatContainer`               | `@carbon/ai-chat` component | Mounts the chat UI.                                                             |
| `PublicConfig`                | `@carbon/ai-chat` type      | Types the config object passed to `ChatContainer`.                              |
| `SuggestionType.AUTOCOMPLETE` | `@carbon/ai-chat` enum      | Selects the autocomplete suggestion behavior.                                   |
| `SuggestionItem`              | `@carbon/ai-chat` type      | Shape of each entry returned from `items` and surfaced to `onSelect`.           |
| `CustomListProps`             | `@carbon/ai-chat` type      | Props (`items`, `query`, `onSelect`, `onDismiss`) given to the custom renderer. |
| `input.suggestions`           | config prop                 | Registers the typeahead behavior on the input.                                  |
| `suggestion.renderCustomList` | config prop                 | Returns a React node that replaces the default dropdown.                        |
| `suggestion.items`            | config prop                 | Async filter providing entries to the custom list.                              |
| `suggestion.debounceMs`       | config prop                 | Coalesces keystrokes before calling `items`.                                    |
| `messaging.customSendMessage` | config prop                 | Mock backend echoing the user's message.                                        |
| `injectCarbonTheme`           | config prop                 | Applies the white Carbon theme.                                                 |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-typeahead-custom
```

See [../README.md](../README.md) for the full setup walkthrough.
