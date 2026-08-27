# BaseSuggestionConfig

- Kind: Interface
- Category: Config
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.BaseSuggestionConfig.html

Fields shared by every Carbon suggestion config (mention, command,
autocomplete). Provides the item source, debounce, minimum query length,
selection callback, an optional custom list renderer, and a
`disableDirectSend` flag that inserts a clicked item into the editor
instead of sending it straight to the assistant.

## Signature

```ts
interface BaseSuggestionConfig
```

## Members

### disableDirectSend

`disableDirectSend?: boolean`

When `true`, clicking a suggestion item fires `cds-aichat-autocomplete-select`
and inserts the item into the editor rather than sending immediately.
Defaults to `false`. This property is omitted in TriggerSuggestionConfig
since mentions and commands should always insert into the editor.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.BaseSuggestionConfig.html#disabledirectsend)

### items

`items: SuggestionItem[] | ((query: string) => SuggestionItem[] | Promise<SuggestionItem[]>)`

Static item list or async function called with the current query string.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.BaseSuggestionConfig.html#items)

### minQueryLength

`minQueryLength?: number`

Minimum query length before items() is called. Defaults to 0.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.BaseSuggestionConfig.html#minquerylength)

### onSelect

`onSelect?: (item: SuggestionItem) => void`

Called after the user selects an item and insertion is complete.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.BaseSuggestionConfig.html#onselect)

### renderCustomList

`renderCustomList?: (props: CustomListProps) => unknown`

Replace the built-in suggestion list UI.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.BaseSuggestionConfig.html#rendercustomlist)
