# Input / Typeahead

`<cds-aichat-custom-element>` configured with `input.autocomplete` so a curated list filters as the user types and renders the matches in a dropdown above the input.

## What this example shows

- Configuring `input.autocomplete` with a single resolver — autocomplete has no trigger character; the dropdown opens whenever there is input and filters as the user types.
- Resolving suggestions asynchronously from an `items` callback that filters a canned list by case-insensitive label match.
- Using `debounceMs: 150` to coalesce rapid keystrokes before invoking `items`.
- Returning an empty array when no entries match to suppress the dropdown.

## When to use this pattern

- You want inline autocomplete suggestions while the user composes a message, without a dedicated trigger character.
- You have a small, locally-known set of suggestions (commands, FAQs, canned prompts) that filter by substring.
- You need a starting point for fetching suggestions from a remote source — swap the canned filter for a network call inside `items`.

## APIs and props demonstrated

| Symbol                          | Kind           | Role in this example                                  |
| ------------------------------- | -------------- | ----------------------------------------------------- |
| `<cds-aichat-custom-element>`   | custom element | Mounts the chat UI at the fullscreen baseline.        |
| `PublicConfig`                  | type           | Types the config bound to the element's properties.   |
| `SuggestionItem`                | type           | Shape of each entry returned from `items`.            |
| `.input` (`input.autocomplete`) | property       | Registers the typeahead behavior on the input.        |
| `autocomplete.items`            | property       | Async filter that returns matching `SuggestionItem`s. |
| `autocomplete.debounceMs`       | property       | Coalesces keystrokes before calling `items`.          |
| `.layout` (`layout.showFrame`)  | property       | Hides the default frame so the chat fills the host.   |
| `.openChatByDefault`            | property       | Mounts straight into the conversation, no launcher.   |
| `.messaging.customSendMessage`  | property       | Mock backend echoing the user's message.              |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-input-typeahead
```

See [../README.md](../README.md) for the full setup walkthrough.
