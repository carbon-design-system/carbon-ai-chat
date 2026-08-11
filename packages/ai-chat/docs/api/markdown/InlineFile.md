# InlineFile

**Experimental.**

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0-rc.0/docs/interfaces/Type_reference.InlineFile.html

Represents an inline file — the actual File object to be uploaded.
Use this when the file needs to be uploaded as part of the message send.
The widget passes this through to customSendMessage unchanged; actual upload
handling is the responsibility of the customSendMessage implementation.

## Signature

```ts
interface InlineFile
```

## Members

### file

`file: File`

**Experimental.**

The actual File object.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0-rc.0/docs/interfaces/Type_reference.InlineFile.html#file)

### id

`id?: string`

**Experimental.**

Optional unique ID for tracking.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0-rc.0/docs/interfaces/Type_reference.InlineFile.html#id)

### type

`type: "inline"`

**Experimental.**

Type discriminator.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0-rc.0/docs/interfaces/Type_reference.InlineFile.html#type)
