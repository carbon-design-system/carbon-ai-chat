# History / File attachments

A restored conversation whose user message carries an uploaded file. The chat renders the attachment as a chip in the message bubble, so a file the user attached is still visible after a reload.

## What this example shows

- Persisting an attachment by putting a `file`-typed `StructuredField` on the request's `structured_data`, which round-trips inside a `HistoryItem` with no storage of its own.
- Returning that history from `messaging.customLoadHistory` so the chat rebuilds the transcript on boot.
- The chat rendering one chip per `file`-typed field in the user's bubble, with a file-type icon derived from `name` and `mime_type`.
- Using an `ExternalFileReference` rather than an `InlineFile`, because a reference needs no `File` object and is the shape that survives serialization.
- Leaving `url` off the rendered output: the chat never renders a download link, so the field is available to your own code only.

## When to use this pattern

- Your users attach files and you persist conversations, so the attachment has to reappear when a conversation is reloaded.
- Your `onFileUpload` handler stores the file server-side and you want the chat to show what was attached without re-downloading it.
- You are writing a `customLoadHistory` implementation and need the shape a message with an attachment takes.

## APIs and props demonstrated

| Symbol | Package / kind | Role in this example |
| --- | --- | --- |
| `ChatCustomElement` | `@carbon/ai-chat` component | Mounts the chat into a host element you style. |
| `PublicConfig` | `@carbon/ai-chat` type | Types the config passed to `ChatCustomElement`. |
| `messaging.customLoadHistory` | config prop | Returns the restored conversation on boot. |
| `messaging.customSendMessage` | config prop | Minimal mock backend so the input stays usable. |
| `layout.showFrame` | config prop | Disables the built-in frame. |
| `openChatByDefault` | config prop | Opens the chat on mount. |
| `HistoryItem` | `@carbon/ai-chat` type | Wraps each restored message with its timestamp. |
| `MessageRequest` | `@carbon/ai-chat` type | The user turn that carries the attachment. |
| `MessageResponse` | `@carbon/ai-chat` type | The assistant turns in the restored transcript. |
| `MessageInput.structured_data` | `@carbon/ai-chat` type | Where the attachment lives on the request. |
| `StructuredField` | `@carbon/ai-chat` type | The `file`-typed field the chat renders. |
| `ExternalFileReference` | `@carbon/ai-chat` type | File metadata that survives serialization. |
| `MessageInputType` | `@carbon/ai-chat` enum | `TEXT` on the restored requests. |
| `MessageResponseTypes` | `@carbon/ai-chat` enum | `TEXT` on the restored responses. |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-history-file-attachments
```

See [../README.md](../README.md) for the full setup walkthrough.
