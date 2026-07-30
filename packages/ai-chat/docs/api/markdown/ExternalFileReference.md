# ExternalFileReference

**Experimental.**

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ExternalFileReference.html

Represents an external file reference — a file already uploaded elsewhere.
Use this when files are uploaded separately and you just need to reference them.

## Signature

```ts
interface ExternalFileReference
```

## Members

### id

`id: string`

**Experimental.**

File identifier (could be a database ID, UUID, etc.).

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ExternalFileReference.html#id)

### mime_type

`mime_type?: string`

**Experimental.**

Optional MIME type.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ExternalFileReference.html#mime_type)

### name

`name?: string`

**Experimental.**

Optional filename for display.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ExternalFileReference.html#name)

### size

`size?: number`

**Experimental.**

Optional file size in bytes.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ExternalFileReference.html#size)

### type

`type: "reference"`

**Experimental.**

Type discriminator.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ExternalFileReference.html#type)

### url

`url?: string`

**Experimental.**

Optional URL to the file.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ExternalFileReference.html#url)
