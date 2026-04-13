# Web Components File Upload Example

This example demonstrates how to integrate file uploads into a Carbon AI Chat web component application using the `UploadConfig.onFileUpload` API.

## What it shows

- Enabling the file attachment button in the chat input via `upload.is_on: true`
- Implementing a mock `onFileUpload` handler that simulates a 1-second server upload and returns an `ExternalFileReference`
- Handling abort signals so in-flight uploads are cancelled when the user removes a pending file
- Echoing back uploaded file metadata (name, type, size, server ID) in the assistant response — mirroring what a real backend might return

## Running in development

Install dependencies once from the repository root:

```bash
npm install
```

Start the dev server:

```bash
npm run start --workspace=@carbon/ai-chat-examples-web-components-file-upload
```

This opens the example on `localhost:3024`.

## Building for production

```bash
npm run build --workspace=@carbon/ai-chat-examples-web-components-file-upload
```

## Key files

| File                                                     | Purpose                                                                                      |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [`src/main.ts`](./src/main.ts)                           | Lit web component that configures `upload.onFileUpload` and renders `<cds-aichat-container>` |
| [`src/mockOnFileUpload.ts`](./src/mockOnFileUpload.ts)   | Mock `onFileUpload` handler + `doFileUploadResponse` helper                                  |
| [`src/customSendMessage.ts`](./src/customSendMessage.ts) | Custom send message handler that echoes file metadata back                                   |

## Replacing the mock with a real backend

Swap out `mockOnFileUpload` in `src/main.ts` with your own implementation:

```ts
async function myOnFileUpload(
  file: File,
  abortSignal: AbortSignal,
): Promise<StructuredData> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
    signal: abortSignal,
  });

  const { id } = await response.json();

  return {
    fields: [
      {
        id: "file",
        type: "file",
        value: {
          type: "reference",
          id,
          name: file.name,
          mime_type: file.type,
          size: file.size,
        },
      },
    ],
  };
}
```
