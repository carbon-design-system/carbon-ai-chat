# File Upload

`ChatContainer` with file attachments enabled, using a mock `onFileUpload` handler that simulates a server upload and echoes back file metadata.

## What this example shows

- Enabling attachments with `upload.is_on: true` and providing an `onFileUpload` handler.
- Simulating a 1-second upload with `AbortSignal` support and returning an `ExternalFileReference` wrapped in `StructuredData`.
- Echoing attached file metadata back as a text message via `instance.messaging.addMessage` and `MessageResponseTypes.TEXT`.
- Documenting the optional `accept`, `maxFileSizeBytes`, and `maxFiles` config knobs (commented in source).

## When to use this pattern

- You need a reference for wiring file uploads into a Carbon AI Chat React app.
- You want to see how server-assigned file references flow back to the chat as `StructuredData`.

## APIs and props demonstrated

| Symbol                                 | Package / kind              | Role in this example                                        |
| -------------------------------------- | --------------------------- | ----------------------------------------------------------- |
| `ChatContainer`                        | `@carbon/ai-chat` component | Mounts the chat UI.                                         |
| `PublicConfig`                         | `@carbon/ai-chat` type      | Types the config.                                           |
| `ExternalFileReference`                | `@carbon/ai-chat` type      | Server-assigned file reference returned by the mock upload. |
| `StructuredData`                       | `@carbon/ai-chat` type      | Wraps the file reference returned from `onFileUpload`.      |
| `StructuredField`                      | `@carbon/ai-chat` type      | Typed entry inside `StructuredData.fields`.                 |
| `MessageRequest`                       | `@carbon/ai-chat` type      | Inspected for `structured_data` to echo files.              |
| `ChatInstance`                         | `@carbon/ai-chat` type      | Used by the mock server response helper.                    |
| `MessageResponseTypes`                 | `@carbon/ai-chat` enum      | `TEXT` used to echo file metadata.                          |
| `upload.is_on`                         | config prop                 | Enables attachments.                                        |
| `upload.onFileUpload`                  | config prop                 | Mock upload handler returning `StructuredData`.             |
| `upload.accept` (documented)           | config prop                 | Optional MIME/extension allowlist.                          |
| `upload.maxFileSizeBytes` (documented) | config prop                 | Optional per-file size cap.                                 |
| `upload.maxFiles` (documented)         | config prop                 | Optional per-message file count cap.                        |
| `messaging.customSendMessage`          | config prop                 | Mock backend; forwards file messages to the echo helper.    |
| `instance.messaging.addMessage`        | instance method             | Injects the echoed text response.                           |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-file-upload
```

See [../README.md](../README.md) for the full setup walkthrough.
