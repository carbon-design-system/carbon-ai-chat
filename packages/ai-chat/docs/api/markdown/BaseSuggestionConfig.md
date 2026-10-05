<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# BaseSuggestionConfig

- Kind: Interface
- Category: Config
- Reference: https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/interfaces/Type_reference.BaseSuggestionConfig.html

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

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/interfaces/Type_reference.BaseSuggestionConfig.html#disabledirectsend)

### items

`items: SuggestionItem[] | ((query: string) => SuggestionItem[] | Promise<SuggestionItem[]>)`

Static item list, or an async function called with the current query
string. Resolved by the autocomplete controller once per query change —
the Tiptap extensions never call it.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/interfaces/Type_reference.BaseSuggestionConfig.html#items)

### minQueryLength

`minQueryLength?: number`

Minimum query length before `items()` is called. Defaults to 0. Applied
by the autocomplete controller, which owns resolution for every trigger.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/interfaces/Type_reference.BaseSuggestionConfig.html#minquerylength)

### onSelect

`onSelect?: (item: SuggestionItem) => void`

Called after the user selects an item and the controller has finished
inserting it.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/interfaces/Type_reference.BaseSuggestionConfig.html#onselect)

### renderCustomList

`renderCustomList?: (props: CustomListProps) => unknown`

Replace the built-in suggestion list UI.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/interfaces/Type_reference.BaseSuggestionConfig.html#rendercustomlist)
