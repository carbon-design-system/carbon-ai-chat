# Input / Typeahead

`ChatCustomElement` configured with an `AUTOCOMPLETE` suggestion that filters a canned list as the user types and renders the matches in a dropdown above the input.

## What this example shows

- Configuring `input.suggestions` with a single `SuggestionType.AUTOCOMPLETE` entry and an empty `trigger` (matches on every keystroke).
- Resolving suggestions asynchronously from an `items` callback that filters a canned list by case-insensitive label match.
- Using `debounceMs: 150` to coalesce rapid keystrokes before invoking `items`.
- Returning an empty array when the query is whitespace-only to suppress the dropdown.

## When to use this pattern

- You want inline autocomplete suggestions while the user composes a message, without a dedicated trigger character.
- You have a small, locally-known set of suggestions (commands, FAQs, canned prompts) that filter by substring.
- You need a starting point for fetching suggestions from a remote source — swap the canned filter for a network call inside `items`.

## APIs and props demonstrated

| Symbol                        | Package / kind              | Role in this example                                   |
| ----------------------------- | --------------------------- | ------------------------------------------------------ |
| `ChatCustomElement`           | `@carbon/ai-chat` component | Mounts the chat UI at the fullscreen baseline.         |
| `PublicConfig`                | `@carbon/ai-chat` type      | Types the config object passed to `ChatCustomElement`. |
| `SuggestionType.AUTOCOMPLETE` | `@carbon/ai-chat` enum      | Selects the autocomplete suggestion behavior.          |
| `SuggestionItem`              | `@carbon/ai-chat` type      | Shape of each entry returned from `items`.             |
| `input.suggestions`           | config prop                 | Registers the typeahead behavior on the input.         |
| `suggestion.trigger`          | config prop                 | Empty string fires `items` on every keystroke.         |
| `suggestion.items`            | config prop                 | Async filter that returns matching `SuggestionItem`s.  |
| `suggestion.debounceMs`       | config prop                 | Coalesces keystrokes before calling `items`.           |
| `layout.showFrame`            | config prop                 | Hides the default frame so the chat fills the host.    |
| `openChatByDefault`           | config prop                 | Mounts straight into the conversation, no launcher.    |
| `messaging.customSendMessage` | config prop                 | Mock backend echoing the user's message.               |
| `injectCarbonTheme`           | config prop                 | Applies the white Carbon theme.                        |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-input-typeahead
```

See [../README.md](../README.md) for the full setup walkthrough.
