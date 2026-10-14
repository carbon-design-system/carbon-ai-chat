<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# SelectionDisplay

- Kind: Enum
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.23.0-rc.0/docs/enums/Type_reference.SelectionDisplay.html

Controls which choice text appears in the user transcript. The generated request stores the resolved text in
MessageRequest.history, even when SingleOption.silent or ButtonItem.silent hides the message.

## Signature

```ts
enum SelectionDisplay
```

## Members

### INPUT_TEXT

`INPUT_TEXT = "input_text"`

Shows `value.input.text`, or the choice label when the input text is empty.

[Reference](https://chat.carbondesignsystem.com/version/v1.23.0-rc.0/docs/enums/Type_reference.SelectionDisplay.html#input_text)

### LABEL

`LABEL = "label"`

Shows the choice label, or `value.input.text` when the label is empty.

[Reference](https://chat.carbondesignsystem.com/version/v1.23.0-rc.0/docs/enums/Type_reference.SelectionDisplay.html#label)

## Related

- [ButtonItem.silent](./ButtonItem.md)
- [MessageRequest.history](./MessageRequest.md)
- [SingleOption.silent](./SingleOption.md)
