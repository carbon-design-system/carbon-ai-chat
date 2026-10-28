<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# TriggerSuggestionConfig

- Kind: Interface
- Category: Config
- Reference: https://chat.carbondesignsystem.com/version/v1.24.0-rc.0/docs/interfaces/Type_reference.TriggerSuggestionConfig.html

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

Static item list, or an async function called with the current query
string. Resolved by the autocomplete controller once per query change —
the Tiptap extensions never call it.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.0/docs/interfaces/Type_reference.TriggerSuggestionConfig.html#items)

### minQueryLength

`minQueryLength?: number`

Minimum query length before `items()` is called. Defaults to 0. Applied
by the autocomplete controller, which owns resolution for every trigger.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.0/docs/interfaces/Type_reference.TriggerSuggestionConfig.html#minquerylength)

### onRemove

`onRemove?: (item: SuggestionItem) => void`

Called when a token chip for this trigger **leaves** the editor via any
user edit: backspace, delete, cut, select-all+type, undo of an insert, ....
Fires once per removed node instance, so deleting one of two identical
chips fires exactly once. Use it to keep host-owned structured data in sync
with the editor.

The item is reconstructed from the node's stored attributes (`id`,
`label`, `value`, plus any custom fields preserved in `data`);
presentation-only fields (`avatar`, `description`, `disabled`,
`showTriggerInChip`) are not retained on the node and are absent.
`updateContent` tags host-origin transactions and suppresses `onRemove`.
Raw `getEditor()` commands require explicit `setHostOriginMeta` tagging.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.0/docs/interfaces/Type_reference.TriggerSuggestionConfig.html#onremove)

### onSelect

`onSelect?: (item: SuggestionItem) => void`

Called whenever a token chip for this trigger **enters** the editor via
any user edit: selecting from the autocomplete, undo restoring a deleted chip,
or redo. Fires once per added node instance (duplicate chips with
the same id are tracked individually).

The item is reconstructed from the node's stored attributes (`id`,
`label`, `value`, plus any custom fields preserved in `data`);
presentation-only fields (`avatar`, `description`, `disabled`,
`showTriggerInChip`) are not retained on the node and are absent.
`updateContent` tags host-origin transactions and suppresses `onSelect`.
Raw `getEditor()` commands require explicit `setHostOriginMeta` tagging.

Use the symmetric TriggerSuggestionConfig.onRemove to keep
host-owned structured data in sync in both directions.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.0/docs/interfaces/Type_reference.TriggerSuggestionConfig.html#onselect)

### renderCustomList

`renderCustomList?: (props: CustomListProps) => unknown`

Replace the built-in suggestion list UI.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.0/docs/interfaces/Type_reference.TriggerSuggestionConfig.html#rendercustomlist)

### renderCustomToken

`renderCustomToken?: (item: SuggestionItem) => HTMLElement | ReactNode`

Replace the visual element rendered inside the token chip.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.0/docs/interfaces/Type_reference.TriggerSuggestionConfig.html#rendercustomtoken)

### showTriggerInChip

`showTriggerInChip?: boolean`

Default for whether the trigger character prefixes the rendered chip,
applied to every item from this config unless the item sets its own
SuggestionItem.showTriggerInChip. Defaults to `true` for
`carbonCommand` and `false` for `carbonMention` when omitted.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.0/docs/interfaces/Type_reference.TriggerSuggestionConfig.html#showtriggerinchip)

### trigger

`trigger: string`

Character that activates the suggestion (e.g. "@", "/").

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.0/docs/interfaces/Type_reference.TriggerSuggestionConfig.html#trigger)

### triggerPosition

`triggerPosition?: "start" | "anywhere"`

Whether the trigger must appear at the start of the input/line, or
 anywhere. Defaults to "anywhere".

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.0/docs/interfaces/Type_reference.TriggerSuggestionConfig.html#triggerposition)

## Related

- [BaseSuggestionConfig](./BaseSuggestionConfig.md)
- [InputConfig.command](./InputConfig.md)
- [InputConfig.mention](./InputConfig.md)
