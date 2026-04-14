# File Upload

Enables file attachments on `<cds-aichat-container>` with a mock `onFileUpload` handler that simulates a server round-trip and echoes the file metadata back in the assistant response.

## What this example shows

- Turning on the file-attachment button in the chat input via `upload.is_on: true`.
- Supplying an `upload.onFileUpload` handler that returns an `ExternalFileReference` / `StructuredData` payload after a simulated 1-second upload.
- Respecting `AbortSignal` so removing a pending attachment cancels its in-flight upload.
- Echoing file metadata (name, type, size, server id) back through `customSendMessage`.
- Documenting optional upload guards (`accept`, `maxFileSizeBytes`, `maxFiles`) as commented configuration.

## When to use this pattern

- You need users to attach files to chat messages.
- You want a template for wiring `onFileUpload` to a real `/api/upload` endpoint.

## APIs and props demonstrated

| Symbol                        | Kind           | Role in this example                                                            |
| ----------------------------- | -------------- | ------------------------------------------------------------------------------- |
| `<cds-aichat-container>`      | custom element | Mounts the chat UI.                                                             |
| `messaging.customSendMessage` | property       | Mock backend that echoes uploaded-file metadata.                                |
| `upload.is_on`                | property       | Enables the attachment button.                                                  |
| `upload.onFileUpload`         | property       | Mock upload handler returning `StructuredData` with an `ExternalFileReference`. |
| `AbortSignal`                 | API            | Cancels in-flight uploads when a pending file is removed.                       |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-file-upload
```

See [../README.md](../README.md) for the full setup walkthrough.
