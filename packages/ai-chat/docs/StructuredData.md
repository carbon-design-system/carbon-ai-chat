---
title: Structured data
---

## Overview

A user's message sometimes carries more than text — a form selection, a rating, or an uploaded file. {@link StructuredData | Structured data} is a typed payload that travels with the user's input, so your agent gets that extra context.

Structured data is request-side only: it travels on {@link MessageInput.structured_data | input.structured_data} in the {@link MessageRequest | request} your {@link PublicConfigMessaging.customSendMessage | customSendMessage} function receives, and it's never part of a {@link MessageResponse | response}. Two sources fill it, and both merge into one payload:

- **The host sets it** — push fields into the pending input with {@link ChatInstanceInput.updateStructuredData | updateStructuredData}.
- **File uploads contribute it** — when {@link PublicConfig.upload | upload} is on, each file's {@link UploadConfig.onFileUpload | onFileUpload} handler returns a fragment that merges in.

> This API is experimental. Its shape may still change.

## The shape

A {@link StructuredData | structured data} payload has two parts. `fields` is an array of {@link StructuredField | field} entries, each with an `id`, a `value`, and an optional `label` and {@link StructuredFieldType | type}. `user_defined` is an escape hatch for any data that doesn't fit a field.

```typescript
const data: StructuredData = {
  fields: [
    { id: "rating", value: 4 },
    { id: "topics", value: ["billing", "shipping"] },
  ],
  user_defined: { source_widget: "checkout-page" },
};
```

Each field's `value` is carried as `unknown` — the chat never inspects it, so put whatever your backend needs there and narrow it yourself in {@link PublicConfigMessaging.customSendMessage}.

`type` is optional, and only three values mean anything to the chat: `file` (see [File uploads](#file-uploads) below), and `mention` / `command` (produced by the {@link InputConfig.mention} and {@link InputConfig.command} input nodes). You may set `type` to any other string to tag a field for your own code, but the chat treats it as an opaque pass-through hint.

## Setting structured data from the host

Call {@link ChatInstanceInput.updateStructuredData | updateStructuredData} with an updater that receives the current pending data (or `undefined`) and returns the next value — return `undefined` to clear it. Whatever is pending merges into the next message the user sends.

```typescript
// Add a field, preserving anything already pending.
instance.input.updateStructuredData((prev) => ({
  ...prev,
  fields: [...(prev?.fields ?? []), { id: "rating", value: 4 }],
}));
```

Host data and upload contributions stay separate: uploads merge on top of what you set and never overwrite it, so you never reconcile the two. Read the current merged snapshot from `instance.getState().input.structuredData`.

## Reading it on your server

Inside {@link PublicConfigMessaging.customSendMessage | customSendMessage}, read the payload off the request. It clears after each send, so the next message starts clean.

Because `value` is `unknown`, narrow it before you use it:

```typescript
async function customSendMessage(request, requestOptions, instance) {
  const fields = request.input.structured_data?.fields ?? [];

  const rating = fields.find((field) => field.id === "rating")?.value;
  if (typeof rating === "number") {
    // ...handle the rating alongside request.input.text
  }

  const files = fields
    .filter((field) => field.type === "file")
    .map((field) => field.value as FileFieldValue);
}
```

## File uploads

A file upload is one kind of structured data: an uploaded file becomes a `file`-typed {@link StructuredField | field} that you read on the server exactly like any other field.

Enable it with {@link PublicConfig.upload | upload}. Set `is_on: true`, provide an `onFileUpload` handler, and optionally constrain attachments with `accept`, `maxFileSizeBytes`, and `maxFiles` (see {@link UploadConfig} for the full list):

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

{@link UploadConfig.onFileUpload | onFileUpload} runs once per file, the moment it's selected. It receives the `File` and an `AbortSignal` and returns a `Promise<StructuredData>` — typically you upload to your backend and return a reference to the stored file:

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

Honor the `abortSignal`; it fires when the user removes a pending upload or the chat is destroyed. Throw or reject to mark the file errored in the UI. While an upload is in flight, the Send button is disabled — watch this with {@link PublicInputState.hasInFlightUploads | hasInFlightUploads}.

A `file` field's value is a {@link FileFieldValue | file value}, one of two types. A {@link ExternalFileReference | reference} (`type: "reference"`) points to a file you uploaded yourself — the common case shown above. An {@link InlineFile | inline file} (`type: "inline"`) carries the raw `File` through to `customSendMessage` for you to upload there.

## Related

- [Message format](./MessageFormat.md) — the request and response shapes, including `input.structured_data`.
- [Server communication](./CustomServer.md) — wire the chat to your server.
- File upload examples: [React](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react/prompt-line-file-upload) and [web component](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/web-components/prompt-line-file-upload).
