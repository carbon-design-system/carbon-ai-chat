# UploadConfig

**Experimental.**

- Kind: Interface
- Category: Config
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.UploadConfig.html

Configuration for file upload behavior in the chat input.

## Signature

```ts
interface UploadConfig
```

## Members

### accept

`accept?: string`

**Experimental.**

Accepted MIME types or file extensions, in the same format as the HTML `accept` attribute.
Examples: `"image/*"`, `".pdf,.docx"`, `"application/pdf"`.
If omitted, all file types are accepted.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.UploadConfig.html#accept)

### is_on

`is_on: boolean`

**Experimental.**

Whether file upload is enabled. When `true`, the chat renders a file attachment button
in the input area. Defaults to `false`.

If `is_on` is `true` but `onFileUpload` is not provided, an error is logged and
file upload is disabled.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.UploadConfig.html#is_on)

### maxFileSizeBytes

`maxFileSizeBytes?: number`

**Experimental.**

Maximum file size in bytes. Files exceeding this limit are rejected client-side
before `onFileUpload` is called.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.UploadConfig.html#maxfilesizebytes)

### maxFiles

`maxFiles?: number`

**Experimental.**

Maximum number of files that can be attached at once. If omitted, there is no limit.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.UploadConfig.html#maxfiles)

### onFileUpload

`onFileUpload?: (file: File, abortSignal: AbortSignal) => Promise<StructuredData>`

**Experimental.**

Called once per file when the user selects it.

Return a StructuredData object representing this file's contribution to the
pending message. The widget merges the returned `StructuredData` into
`pendingStructuredData` and tracks it per-upload so that individual files can be
removed before the message is sent.

On failure: throw or return a rejected `Promise` — the widget marks the file as
errored in the UI.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.UploadConfig.html#onfileupload)
