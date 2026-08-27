# StructuredData

**Experimental.**

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.StructuredData.html

Structured data that can be sent alongside or instead of plain text input.
Carries an array of StructuredField entries plus `user_defined`, an
escape hatch for arbitrary host-defined data.

## Signature

```ts
interface StructuredData
```

## Members

### fields

`fields?: StructuredField[]`

**Experimental.**

The structured fields carried with the message.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.StructuredData.html#fields)

### user_defined

`user_defined?: Record<string, any>`

**Experimental.**

Escape hatch: arbitrary key-value data for user-defined implementations.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.StructuredData.html#user_defined)

## Related

- [StructuredField](./StructuredField.md)
