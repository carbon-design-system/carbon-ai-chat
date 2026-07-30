# FileUploadCapabilities

- Kind: Interface
- Category: Instance
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.FileUploadCapabilities.html

Upload options. Currently only applies to conversations with a human agent.

## Signature

```ts
interface FileUploadCapabilities
```

## Members

### allowFileUploads

`allowFileUploads: boolean`

Indicates that file uploads may be performed by the user.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.FileUploadCapabilities.html#allowfileuploads)

### allowMultipleFileUploads

`allowMultipleFileUploads: boolean`

If file uploads are allowed, this indicates if more than one file may be selected at a time. The default is false.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.FileUploadCapabilities.html#allowmultiplefileuploads)

### allowedFileUploadTypes

`allowedFileUploadTypes: string`

If file uploads are allowed, this is the set a file types that are allowed. This is filled into the "accept"
field for the file input element.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.FileUploadCapabilities.html#allowedfileuploadtypes)
