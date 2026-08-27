# StructuredField

**Experimental.**

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.StructuredField.html

A single field within a StructuredData payload.

## Signature

```ts
interface StructuredField
```

## Members

### id

`id: string`

**Experimental.**

Unique identifier for this field. Read it back in
PublicConfigMessaging.customSendMessage to find the field you sent.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.StructuredField.html#id)

### label

`label?: string`

**Experimental.**

Human-readable label (optional).

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.StructuredField.html#label)

### type

`type?: StructuredFieldType`

**Experimental.**

The type of field. Only `"file"`, `"mention"`, and `"command"` mean
anything to the chat (see StructuredFieldType); any other value is
carried through untouched for your own
PublicConfigMessaging.customSendMessage to interpret.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.StructuredField.html#type)

### value

`value: unknown`

**Experimental.**

The value of the field, carried untyped. For a `"file"` field it is a
FileFieldValue; for every other field it is whatever your backend
needs — narrow it yourself in
PublicConfigMessaging.customSendMessage.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.StructuredField.html#value)

## Related

- [StructuredData](./StructuredData.md)
