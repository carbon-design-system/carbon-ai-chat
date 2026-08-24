# CustomListProps

**Experimental.**

- Kind: Interface
- Category: Config
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.CustomListProps.html

Props passed to a custom suggestion-list renderer (the `renderCustomList`
field on BaseSuggestionConfig). Includes the filtered
SuggestionItem array, the current `query`, and the `onSelect` /
`onSend` / `onDismiss` callbacks.

## Signature

```ts
interface CustomListProps
```

## Members

### items

`items: SuggestionItem[]`

**Experimental.**

Current filtered items to display.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.CustomListProps.html#items)

### onDismiss

`onDismiss: () => void`

**Experimental.**

Callback to invoke when list should be dismissed.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.CustomListProps.html#ondismiss)

### onSelect

`onSelect: (item: SuggestionItem) => void`

**Experimental.**

Callback to invoke when user selects an item to insert into the editor
without sending to chat.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.CustomListProps.html#onselect)

### onSend

`onSend: (text: string) => void`

**Experimental.**

Callback to invoke when user sends an item directly to chat, bypassing
the editor.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.CustomListProps.html#onsend)

### query

`query: string`

**Experimental.**

Current query string (text after trigger).

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.CustomListProps.html#query)

## Related

- [BaseSuggestionConfig](./BaseSuggestionConfig.md)
- [SuggestionItem](./SuggestionItem.md)
