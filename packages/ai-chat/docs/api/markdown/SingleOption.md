<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# SingleOption

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.23.0/docs/interfaces/Type_reference.SingleOption.html

Represents an individual option that is part of an "options" response.

## Signature

```ts
interface SingleOption
```

## Members

### label

`label: string`

The text shown on the control. If this value is empty, the control shows `value.input.text`. The chat does
not render the control when both values are empty.

[Reference](https://chat.carbondesignsystem.com/version/v1.23.0/docs/interfaces/Type_reference.SingleOption.html#label)

### selection_display

`selection_display?: SelectionDisplay`

Controls the text shown in the generated user message. The default is SelectionDisplay.LABEL. The
preferred text falls back to the other available text. The resolved text is stored in MessageRequest.history
and remains there when SingleOption.silent hides the message.

[Reference](https://chat.carbondesignsystem.com/version/v1.23.0/docs/interfaces/Type_reference.SingleOption.html#selection_display)

### silent

`silent?: boolean`

Hides the generated user message when true. The option still enters its selected state, and its resolved text
remains in request history.

[Reference](https://chat.carbondesignsystem.com/version/v1.23.0/docs/interfaces/Type_reference.SingleOption.html#silent)

### value

`value: { input: MessageInput }`

[Reference](https://chat.carbondesignsystem.com/version/v1.23.0/docs/interfaces/Type_reference.SingleOption.html#value)
