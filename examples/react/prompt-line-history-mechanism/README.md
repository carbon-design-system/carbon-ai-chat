# Prompt line / History mechanism

A keyboard-only Tiptap extension intercepts `ArrowUp` / `ArrowDown` in the chat input to cycle through previously sent messages — shell-style — and writes recalled text back into the editor via `instance.input.updateContent`. Your in-progress draft is saved on the first `ArrowUp` press and restored when you navigate back past the most-recent entry.

## What this example shows

- Registering a keyboard-only Tiptap extension on the chat input via `PublicConfig.input.tiptap.extensions` — no custom node, no node view, no `renderInLightDom`.
- Using `Extension.create` + `addKeyboardShortcuts` to intercept `ArrowUp` / `ArrowDown` with ProseMirror position checks: only fire when the cursor is at position 1 (start of the single paragraph) or at the last position of the doc, and only when the doc has a single block so normal cursor movement in multi-paragraph text is never interrupted.
- Writing recalled text into the editor via `instance.input.updateContent((prev) => textToDoc(text))`.
- Saving the in-progress draft with `getRawText(editor.getJSON())` on the first `ArrowUp` and restoring it when `ArrowDown` moves past entry 0.
- Capturing history inside `customSendMessage` (via `state.entries.push(text)`) — simpler and more direct than subscribing to a bus event, because `customSendMessage` already has the text in hand.
- Sharing state between the keyboard extension and the send handler through a plain mutable `HistoryState` object created once at module scope — no React state, no event bus.
- Capturing `ChatInstance` via `onBeforeRender` and storing it on `historyState.instance` so the keyboard extension can call `instance.input.updateContent` without an event bus subscription.

## When to use this pattern

- Your users re-send variants of previous prompts and a shell-like `↑` / `↓` shortcut would save them time — power-user UX with no visible UI cost.
- You need to write text into the editor from outside React (e.g. from a Tiptap extension callback) and `instance.input.updateContent` + `textToDoc` is the right tool for plain-text content.
- You want to attach behaviour to the prompt-line keyboard without building a full custom node.

## APIs and props demonstrated

| Symbol                         | Package / kind              | Role in this example                                                                          |
| ------------------------------ | --------------------------- | --------------------------------------------------------------------------------------------- |
| `ChatCustomElement`            | `@carbon/ai-chat` component | Mounts the chat UI as a fullscreen surface.                                                   |
| `PublicConfig`                 | `@carbon/ai-chat` type      | Types the config object passed to `ChatCustomElement`.                                        |
| `ChatInstance`                 | `@carbon/ai-chat` type      | Provides `instance.input.updateContent` to write text into the editor.                        |
| `Extension.create`             | `@tiptap/core` API          | Authors the keyboard-only history extension registered on the chat input.                     |
| `addKeyboardShortcuts`         | `@tiptap/core` API          | Hook where `ArrowUp` / `ArrowDown` handlers are declared.                                     |
| `instance.input.updateContent` | `@carbon/ai-chat` API       | Writes recalled history entries (or the saved draft) back into the editor.                    |
| `textToDoc`                    | `@carbon/ai-chat` utility   | Converts a plain-text string into a `JSONContent` doc suitable for `updateContent`.           |
| `getRawText`                   | `@carbon/ai-chat` utility   | Extracts the plain-text string from the editor's `JSONContent` to save the draft.             |
| `onBeforeRender`               | component prop              | Callback that fires once with the `ChatInstance` so `historyState.instance` can be populated. |
| `input.tiptap.extensions`      | config prop                 | Registers the host-authored history `Extension` on the chat input.                            |
| `layout.showFrame`             | config prop                 | Hides the default frame so the chat fills the viewport.                                       |
| `openChatByDefault`            | config prop                 | Mounts straight into the conversation, no launcher.                                           |
| `messaging.customSendMessage`  | config prop                 | Captures sent text into `state.entries` and provides the mock response.                       |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-prompt-line-history-mechanism
```

See [../README.md](../README.md) for the full setup walkthrough.
