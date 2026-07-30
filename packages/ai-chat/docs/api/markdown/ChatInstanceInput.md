# ChatInstanceInput

- Kind: Interface
- Category: Instance
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatInstanceInput.html

Methods for controlling the input field.

## Signature

```ts
interface ChatInstanceInput
```

## Members

### updateRawValue

`updateRawValue: (updater: (previous: string) => string) => void`

**Experimental.**

Updates the raw text queued in the input before it is sent to customSendMessage.
Use this when you want to manipulate the canonical value while leaving presentation up to the default renderer or,
in the future, a custom slot implementation.

## Examples

```ts
instance.input.updateRawValue((prev) => `${prev} @celeste`);
```

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatInstanceInput.html#updaterawvalue)

### updateStructuredData

`updateStructuredData: (updater: (previous: StructuredData) => StructuredData) => void`

**Experimental.**

Updates the pending structured data that will be merged into the next outgoing MessageRequest
when the user sends a message via the UI send button or Enter key. The updater function receives the
current pending structured data (or `undefined` if none is set) and should return the new value.
Return `undefined` to clear the pending structured data.

This is the primary mechanism for pushing structured inputs (form fields, file references, etc.)
into the active input so they are included when the user hits Send.

## Examples

```ts
// Add a field to the pending structured data
instance.input.updateStructuredData((prev) => ({
  ...prev,
  fields: [
    ...(prev?.fields ?? []),
    { id: 'rating', type: 'number', value: 4 }
  ]
}));

// Replace all pending structured data
instance.input.updateStructuredData(() => ({
  fields: [{ id: 'selection', type: 'multi_select', value: ['a', 'b'] }]
}));

// Clear pending structured data
instance.input.updateStructuredData(() => undefined);
```

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatInstanceInput.html#updatestructureddata)
