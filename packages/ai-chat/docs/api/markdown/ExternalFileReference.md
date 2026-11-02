<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# ExternalFileReference

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.ExternalFileReference.html

Represents an external file reference — a file already uploaded elsewhere.
Use this when files are uploaded separately and you just need to reference them.

## Signature

```ts
interface ExternalFileReference
```

## Members

### id

`id: string`

File identifier (could be a database ID, UUID, etc.).

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.ExternalFileReference.html#id)

### mime_type

`mime_type?: string`

Optional MIME type.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.ExternalFileReference.html#mime_type)

### name

`name?: string`

Optional filename for display.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.ExternalFileReference.html#name)

### size

`size?: number`

Optional file size in bytes.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.ExternalFileReference.html#size)

### type

`type: "reference"`

Type discriminator.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.ExternalFileReference.html#type)

### url

`url?: string`

Optional URL to the file.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.ExternalFileReference.html#url)
