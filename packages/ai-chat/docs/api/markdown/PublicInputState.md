# PublicInputState

- Kind: Interface
- Category: Instance
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PublicInputState.html

This is the state made available by calling ChatInstance.getState. This is a public method that returns immutable values.

## Signature

```ts
interface PublicInputState
```

## Members

### hasInFlightUploads

`hasInFlightUploads: boolean`

**Experimental.**

`true` while one or more file uploads initiated via UploadConfig.onFileUpload are still
in progress.  The send button is disabled while this is `true`.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PublicInputState.html#hasinflightuploads)

### rawValue

`rawValue: string`

**Experimental.**

Raw text currently queued in the input before being sent to customSendMessage.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PublicInputState.html#rawvalue)

### structuredData

`structuredData?: StructuredData`

**Experimental.**

A snapshot of the pending structured data currently queued in the input. This data will be merged
into the next outgoing MessageRequest when the user sends a message via the UI.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PublicInputState.html#structureddata)

## Related

- [ChatInstance.getState](./ChatInstance.md)
