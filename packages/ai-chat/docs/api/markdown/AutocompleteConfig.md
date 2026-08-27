# AutocompleteConfig

- Kind: Interface
- Category: Config
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.AutocompleteConfig.html

Live autocomplete config consumed by InputConfig.autocomplete.
Selection inserts plain text rather than a schema node; no chip is
rendered.

## Signature

```ts
interface AutocompleteConfig
```

## Members

### disableDirectSend

`disableDirectSend?: boolean`

When `true`, clicking a suggestion item fires `cds-aichat-autocomplete-select`
and inserts the item into the editor rather than sending immediately.
Defaults to `false`. This property is omitted in TriggerSuggestionConfig
since mentions and commands should always insert into the editor.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.AutocompleteConfig.html#disabledirectsend)

### items

`items: SuggestionItem[] | ((query: string) => SuggestionItem[] | Promise<SuggestionItem[]>)`

Static item list or async function called with the current query string.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.AutocompleteConfig.html#items)

### minQueryLength

`minQueryLength?: number`

Minimum query length before items() is called. Defaults to 0.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.AutocompleteConfig.html#minquerylength)

### onSelect

`onSelect?: (item: SuggestionItem) => void`

Called after the user selects an item and insertion is complete.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.AutocompleteConfig.html#onselect)

### renderCustomList

`renderCustomList?: (props: CustomListProps) => unknown`

Replace the built-in suggestion list UI.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.AutocompleteConfig.html#rendercustomlist)

## Related

- [InputConfig.autocomplete](./InputConfig.md)
