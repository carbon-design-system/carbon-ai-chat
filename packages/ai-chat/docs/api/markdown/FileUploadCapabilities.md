# FileUploadCapabilities

- Kind: Interface
- Category: Instance
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.FileUploadCapabilities.html

Upload options. Currently only applies to conversations with a human agent.

## Signature

```ts
interface FileUploadCapabilities
```

## Members

### allowFileUploads

`allowFileUploads: boolean`

Indicates that file uploads may be performed by the user.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.FileUploadCapabilities.html#allowfileuploads)

### allowMultipleFileUploads

`allowMultipleFileUploads: boolean`

If file uploads are allowed, this indicates if more than one file may be selected at a time. The default is false.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.FileUploadCapabilities.html#allowmultiplefileuploads)

### allowedFileUploadTypes

`allowedFileUploadTypes: string`

If file uploads are allowed, this is the set a file types that are allowed. This is filled into the "accept"
field for the file input element.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.FileUploadCapabilities.html#allowedfileuploadtypes)

### maxFileSizeBytes

`maxFileSizeBytes?: number`

The maximum size, in bytes, allowed for a single uploaded file. Files larger than this are rejected before
upload and the user is told why. When omitted, no size limit is enforced.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.FileUploadCapabilities.html#maxfilesizebytes)

### maxFiles

`maxFiles?: number`

The maximum number of files that may be attached at once. Selecting more than this rejects the extras and
tells the user. When omitted, no count limit is enforced.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.FileUploadCapabilities.html#maxfiles)
