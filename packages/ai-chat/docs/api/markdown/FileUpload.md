<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# FileUpload

- Kind: Interface
- Category: Service desk
- Reference: https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/interfaces/Type_reference.FileUpload.html

Represents a file the user has selected for upload, including its current
FileStatusValue and any error metadata.

## Signature

```ts
interface FileUpload
```

## Members

### errorMessage

`errorMessage?: string`

If the file failed to upload, this is an optional error message to display.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/interfaces/Type_reference.FileUpload.html#errormessage)

### file

`file: File`

The file to upload.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/interfaces/Type_reference.FileUpload.html#file)

### id

`id: string`

A unique ID for the file.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/interfaces/Type_reference.FileUpload.html#id)

### isError

`isError?: boolean`

Indicates if the file contains an error or failed to upload.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/interfaces/Type_reference.FileUpload.html#iserror)

### status

`status: FileStatusValue`

The current upload status.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/interfaces/Type_reference.FileUpload.html#status)

## Related

- [FileStatusValue](./FileStatusValue.md)
