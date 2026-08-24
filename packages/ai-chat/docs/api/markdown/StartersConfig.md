# StartersConfig

- Kind: Interface
- Category: Config
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.StartersConfig.html

Configuration for starter prompts consumed by InputConfig.starters.
Extends BaseSuggestionConfig so a `renderCustomList` callback can
replace the built-in suggestion list (e.g. to add a header above the items).

## Signature

```ts
interface StartersConfig
```

## Members

### disableDirectSend

`disableDirectSend?: boolean`

When `true`, clicking a suggestion item fires `cds-aichat-autocomplete-select`
and inserts the item into the editor rather than sending immediately.
Defaults to `false`. This property is omitted in TriggerSuggestionConfig
since mentions and commands should always insert into the editor.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.StartersConfig.html#disabledirectsend)

### isOn

`isOn?: boolean`

Controls whether the starters list is active. Defaults to `true`.

When true, the list appears automatically whenever the editor is focused
and empty. Set to false to suppress the list without removing the config
entirely. Keeping the config present with isOn: false leaves the editor
intact and lets you toggle the list on and off instantly.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.StartersConfig.html#ison)

### items

`items: SuggestionItem[]`

The starter prompts to display.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.StartersConfig.html#items)

### renderCustomList

`renderCustomList?: (props: CustomListProps) => unknown`

Replace the built-in suggestion list UI.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.StartersConfig.html#rendercustomlist)

## Related

- [BaseSuggestionConfig](./BaseSuggestionConfig.md)
- [InputConfig.starters](./InputConfig.md)
