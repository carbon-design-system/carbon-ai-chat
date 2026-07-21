# StructuredData

**Experimental.**

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.StructuredData.html

Structured data that can be sent alongside or instead of plain text input.
Supports typed fields for common input patterns (text, select, multi-select,
file, etc.) as well as an escape hatch for arbitrary user-defined data.

## Signature

```ts
interface StructuredData
```

## Members

### fields

`fields?: StructuredField[]`

**Experimental.**

Typed fields with known structures (recommended for most use cases).

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.StructuredData.html#fields)

### user_defined

`user_defined?: Record<string, any>`

**Experimental.**

Escape hatch: arbitrary key-value data for user-defined implementations.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.StructuredData.html#user_defined)
