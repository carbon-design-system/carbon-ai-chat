# TriggerSuggestionConfig

- Kind: Interface
- Category: Config
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.TriggerSuggestionConfig.html

Trigger-character-driven suggestion config consumed by
InputConfig.mention and InputConfig.command. Adds the
trigger character, an optional `triggerPosition`, a custom-token renderer,
an `onRemove` callback (the mirror of `onSelect`, fired when a token is
deleted), and a `showTriggerInChip` default (whether selected items render
as `/summarize` or a bare `summarize`, overridable per item) on top of
BaseSuggestionConfig.

Each chat supports one mention trigger and one command trigger.

## Signature

```ts
interface TriggerSuggestionConfig
```

## Members

### items

`items: SuggestionItem[] | ((query: string) => SuggestionItem[] | Promise<SuggestionItem[]>)`

Static item list or async function called with the current query string.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.TriggerSuggestionConfig.html#items)

### minQueryLength

`minQueryLength?: number`

Minimum query length before items() is called. Defaults to 0.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.TriggerSuggestionConfig.html#minquerylength)

### onRemove

`onRemove?: (item: SuggestionItem) => void`

Called when a previously-inserted token for this trigger is removed from
the input by a user edit (backspace, delete, cut, select-all, undo, ...).
The mirror of BaseSuggestionConfig's `onSelect`: fires once per
removed node instance, so deleting one of two identical chips fires
exactly once. Use it to keep host-owned structured data in sync with the
editor.

The item is reconstructed from the node's stored attributes (`id`,
`label`, `value`, plus any custom fields preserved in `data`);
presentation-only fields (`icon`, `avatar`, `description`, `disabled`) are
not retained on the node and are absent. Programmatic removals (via
`getEditor()`/`updateContent`) are host-origin and do NOT fire `onRemove`,
symmetric with `onSelect` not firing on programmatic inserts.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.TriggerSuggestionConfig.html#onremove)

### onSelect

`onSelect?: (item: SuggestionItem) => void`

Called after the user selects an item and insertion is complete.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.TriggerSuggestionConfig.html#onselect)

### renderCustomList

`renderCustomList?: (props: CustomListProps) => unknown`

Replace the built-in suggestion list UI.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.TriggerSuggestionConfig.html#rendercustomlist)

### renderCustomToken

`renderCustomToken?: (item: SuggestionItem) => HTMLElement | ReactNode`

Replace the visual element rendered inside the token chip.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.TriggerSuggestionConfig.html#rendercustomtoken)

### showTriggerInChip

`showTriggerInChip?: boolean`

Default for whether the trigger character prefixes the rendered chip,
applied to every item from this config unless the item sets its own
SuggestionItem.showTriggerInChip. Defaults to `true` for
`carbonCommand` and `false` for `carbonMention` when omitted.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.TriggerSuggestionConfig.html#showtriggerinchip)

### trigger

`trigger: string`

Character that activates the suggestion (e.g. "@", "/").

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.TriggerSuggestionConfig.html#trigger)

### triggerPosition

`triggerPosition?: "start" | "anywhere"`

Whether the trigger must appear at the start of the input/line, or
 anywhere. Defaults to "anywhere".

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.TriggerSuggestionConfig.html#triggerposition)

## Related

- [BaseSuggestionConfig](./BaseSuggestionConfig.md)
- [InputConfig.command](./InputConfig.md)
- [InputConfig.mention](./InputConfig.md)
