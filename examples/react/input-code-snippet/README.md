# Input / Code snippet

A custom Tiptap input rule converts triple backticks (` ``` `) in the chat input into an editable `cds-aichat-code-snippet` block. The closing fence is implicit — it's added at send time, never typed. The block grows with content; the input shell's existing scrollbar takes over when it gets tall. Pressing `Escape` exits the block.

## What this example shows

- Registering a host-authored block-level Tiptap node on the chat input via `PublicConfig.input.tiptap.extensions`.
- Driving insertion with a Tiptap `InputRule` (regex `/^```$/`) so the user types three backticks and the paragraph is swapped for an empty code-snippet block.
- Mounting `<cds-aichat-code-snippet editable highlight>` inside the node view via `renderInLightDom`, so CodeMirror and Carbon styles work even though the chat input lives inside a shadow root.
- Wrapping the editor in a `Card` so it reads as a contained region, with an `Esc to exit code editor` hint in the card's `footer` slot — styled by Carbon's `cds--form__helper-text` class, no custom CSS.
- Sizing the snippet to grow indefinitely (`max-collapsed-number-of-rows`, `max-expanded-number-of-rows` and `--cds-snippet-max-height: none`) so the input shell's existing `overflow-y: auto` is the only scrollbar.
- Keeping `attrs.code` (raw code) and `attrs.value` (fenced markdown) in sync so the chat's `getRawText` projection emits standard ` ``` ` fences when the message is sent.
- Exiting the block with an `Escape` keydown listener on the snippet element that inserts a paragraph after the block and focuses it.
- Rendering a read-only `CodeSnippet` inside the sent user message bubble with `renderUserDefinedInputNode`.

## When to use this pattern

- Your users compose messages that include code, and you want a richer editing experience than a plain `<textarea>` — syntax highlighting, multi-line growth, proper monospace rendering.
- You want the markdown convention (` ``` `) to feel native: users type the trigger they already know, and the closing fence is handled for them.
- You want the same code-snippet component used in chat responses to also drive composition, so the editor and the read-only bubble share visuals.

## APIs and props demonstrated

| Symbol                           | Package / kind                       | Role in this example                                                            |
| -------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------- |
| `ChatCustomElement`              | `@carbon/ai-chat` component          | Mounts the chat UI as a fullscreen surface.                                     |
| `PublicConfig`                   | `@carbon/ai-chat` type               | Types the config object passed to `ChatCustomElement`.                          |
| `RenderUserDefinedInputNode`     | `@carbon/ai-chat` type               | Types the `renderUserDefinedInputNode` callback.                                |
| `Extension`                      | `@tiptap/core` type                  | Types the custom Tiptap node registered on the input.                           |
| `renderInLightDom`               | `@carbon/ai-chat` helper             | Bridges the snippet web component into the page's light DOM.                    |
| `renderUserDefinedInputNode`     | component prop                       | Renders the custom `codeSnippetBlock` node inside the sent user message bubble. |
| `input.tiptap.extensions`        | config prop                          | Registers the host-authored `codeSnippetBlock` Tiptap node on the input.        |
| `layout.showFrame`               | config prop                          | Hides the default frame so the chat fills the viewport.                         |
| `openChatByDefault`              | config prop                          | Mounts straight into the conversation, no launcher.                             |
| `messaging.customSendMessage`    | config prop                          | Mock backend; confirms whether the outgoing text contained a fenced block.      |
| `Node.create`                    | `@tiptap/core` API                   | Authors the `codeSnippetBlock` block atom node.                                 |
| `InputRule`                      | `@tiptap/core` API                   | Triggers the node swap when the user finishes typing three backticks.           |
| `addKeyboardShortcuts` / keydown | `@tiptap/core` / DOM                 | Escape exits the block to a new paragraph below.                                |
| `<cds-aichat-code-snippet>`      | `@carbon/ai-chat-components` element | Editable CodeMirror-backed snippet inside the input; read-only in the bubble.   |
| `CodeSnippet`                    | `@carbon/ai-chat-components/react`   | React wrapper for the snippet, used in the sent message bubble.                 |
| `Card`                           | `@carbon/ai-chat-components/react`   | React wrapper for the card that frames the editable snippet.                    |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-input-code-snippet
```

See [../README.md](../README.md) for the full setup walkthrough.
