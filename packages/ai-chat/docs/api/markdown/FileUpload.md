# FileUpload

- Kind: Interface
- Category: Service desk
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.FileUpload.html

An interface that represents a file to upload and its current upload status.

## Signature

```ts
interface FileUpload
```

## Members

### errorMessage

`errorMessage?: string`

If the file failed to upload, this is an optional error message to display.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.FileUpload.html#errormessage)

### file

`file: File`

The file to upload.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.FileUpload.html#file)

### id

`id: string`

A unique ID for the file.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.FileUpload.html#id)

### isError

`isError?: boolean`

Indicates if the file contains an error or failed to upload.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.FileUpload.html#iserror)

### status

`status: FileStatusValue`

The current upload status.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.FileUpload.html#status)
