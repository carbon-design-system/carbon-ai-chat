<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# InlineFile

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.24.0-rc.0/docs/interfaces/Type_reference.InlineFile.html

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

The actual File object.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.0/docs/interfaces/Type_reference.InlineFile.html#file)

### id

`id?: string`

Optional unique ID for tracking.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.0/docs/interfaces/Type_reference.InlineFile.html#id)

### type

`type: "inline"`

Type discriminator.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.0/docs/interfaces/Type_reference.InlineFile.html#type)
