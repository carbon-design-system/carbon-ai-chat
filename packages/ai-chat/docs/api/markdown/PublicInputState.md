# PublicInputState

- Kind: Interface
- Category: Instance
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.PublicInputState.html

This is the state made available by calling ChatInstance.getState. This is a public method that returns immutable values.

## Signature

```ts
interface PublicInputState
```

## Members

### content

`content: JSONContent`

**Experimental.**

Tiptap-native JSON projection of the editor doc. Updated on every doc
change: user typing, paste, trigger-driven mentions/commands, host-pushed
`updateContent` writes, and any host-dispatched transactions. Always
consistent with `rawValue` (both derive from the same underlying
document; no extra storage).

Hosts persisting this value should serialize through `editor.getJSON()`
(canonical) rather than partial walks; the JSONContent shape is
governed by Tiptap's stability guarantees.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.PublicInputState.html#content)

### focused

`focused: boolean`

**Experimental.**

Whether the input editor currently has focus. Mirrors the
`cds-aichat-input-focus` / `cds-aichat-input-blur` web component
events; for hosts that prefer DOM events or the live editor handle,
those remain available (`(await instance.input.getEditor()).isFocused`).

Toggles in the same dispatch pass as the underlying focus event, so
subscribing via BusEventType.STATE_CHANGE fires once per
focus/blur transition.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.PublicInputState.html#focused)

### hasInFlightUploads

`hasInFlightUploads: boolean`

**Experimental.**

`true` while one or more file uploads initiated via UploadConfig.onFileUpload are still
in progress.  The send button is disabled while this is `true`.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.PublicInputState.html#hasinflightuploads)

### rawValue

`rawValue: string`

**Experimental.**

Raw text currently queued in the input before being sent to customSendMessage.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.PublicInputState.html#rawvalue)

### structuredData

`structuredData?: StructuredData`

**Experimental.**

A snapshot of the pending structured data currently queued in the input. This data will be merged
into the next outgoing MessageRequest when the user sends a message via the UI.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.PublicInputState.html#structureddata)

## Related

- [ChatInstance.getState](./ChatInstance.md)
