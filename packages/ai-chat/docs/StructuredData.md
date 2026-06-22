---
title: Structured data
---

### Overview

Sometimes a user's message needs to carry more than text — a form selection, a rating, or an uploaded file. {@link StructuredData} is a typed payload that rides along with the user's input so your agent receives that extra context.

It is request-side only: it travels on {@link MessageInput.structured_data} in the {@link MessageRequest} your {@link PublicConfigMessaging.customSendMessage} function receives, and is never part of a {@link MessageResponse}. Two sources populate it, and they merge into one payload:

1. **The host sets it** — push fields into the pending input with {@link ChatInstanceInput.updateStructuredData}.
2. **File uploads contribute it** — when {@link PublicConfig.upload} is enabled, each file's {@link UploadConfig.onFileUpload} handler returns a fragment that is merged in.

> This API is experimental. Its shape may still change.

### The shape

A {@link StructuredData} payload has two parts: `fields`, an array of typed {@link StructuredField} entries (each with an `id`, optional `label`, a {@link StructuredFieldType} such as `text`, `select`, `multi_select`, or `file`, and a `value`); and `user_defined`, an escape hatch for arbitrary data that does not fit a typed field.

```typescript
const data: StructuredData = {
  fields: [
    { id: "rating", type: "number", value: 4 },
    { id: "topics", type: "multi_select", value: ["billing", "shipping"] },
  ],
  user_defined: { source_widget: "checkout-page" },
};
```

### Setting structured data from the host

Call {@link ChatInstanceInput.updateStructuredData} with an updater that receives the current pending data (or `undefined`) and returns the next value — return `undefined` to clear it. Whatever is pending is merged into the next message the user sends.

```typescript
// Add a field, preserving anything already pending.
instance.input.updateStructuredData((prev) => ({
  ...prev,
  fields: [...(prev?.fields ?? []), { id: "rating", type: "number", value: 4 }],
}));
```

Host data and upload contributions are kept separate: uploads merge on top of what you set and never overwrite it, so you never reconcile the two. Read the current merged snapshot from `instance.getState().input.structuredData`.

### Reading it on your server

Inside {@link PublicConfigMessaging.customSendMessage}, read the payload off the request. It is cleared after each send, so the next message starts clean.

```typescript
async function customSendMessage(request, requestOptions, instance) {
  const fields = request.input.structured_data?.fields ?? [];
  const rating = fields.find((field) => field.id === "rating")?.value;
  // ...handle the structured input alongside request.input.text
}
```

### File uploads

A file upload is one kind of structured data: an uploaded file becomes a `file`-typed {@link StructuredField}, read on the server exactly like any other field.

Enable it with {@link PublicConfig.upload}. Set `is_on: true`, provide an `onFileUpload` handler, and optionally constrain attachments with `accept`, `maxFileSizeBytes`, and `maxFiles` (see {@link UploadConfig} for the full list):

```typescript
const config: PublicConfig = {
  messaging: { customSendMessage },
  upload: {
    is_on: true,
    onFileUpload: handleFileUpload,
    accept: "image/*,.pdf",
  },
};
```

{@link UploadConfig.onFileUpload} runs once per file the moment it is selected. It receives the `File` and an `AbortSignal` and returns a `Promise<StructuredData>` — typically you upload to your backend and return a reference to the stored file:

```typescript
async function handleFileUpload(
  file: File,
  abortSignal: AbortSignal,
): Promise<StructuredData> {
  const body = new FormData();
  body.append("file", file);

  const res = await fetch("/api/upload", {
    method: "POST",
    body,
    signal: abortSignal,
  });
  const { id, url } = await res.json();

  const reference: ExternalFileReference = {
    type: "reference",
    id,
    url,
    name: file.name,
    mime_type: file.type || "application/octet-stream",
    size: file.size,
  };

  return { fields: [{ id: "file", type: "file", value: reference }] };
}
```

Honor the `abortSignal` — it fires when the user removes a pending upload or the chat is destroyed. Throw or reject to mark the file errored in the UI. While an upload is in flight the Send button is disabled; observe this via {@link PublicInputState.hasInFlightUploads}.

The value of a `file` field is a {@link FileFieldValue} — either an {@link ExternalFileReference} (`type: "reference"`, a pointer to a file you uploaded yourself, the common case shown above) or an {@link InlineFile} (`type: "inline"`, the raw `File` carried through to `customSendMessage` for you to upload there).

### Related

- [Message format](./MessageFormat.md) — the request and response shapes, including `input.structured_data`.
- [Server communication](./CustomServer.md) — wire the chat to your server.
- File upload examples: [React](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react/file-upload) and [web component](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/web-components/file-upload).
