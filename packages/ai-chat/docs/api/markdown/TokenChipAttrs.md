# TokenChipAttrs

- Kind: Interface
- Category: Utilities
- Reference: https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.TokenChipAttrs.html

The attributes stored on a token chip's editor node, reached through
RenderTokenChipArgs.attrs. A chip stores the item's `id`, `label`,
and `value`, plus any custom fields in `data`. The presentation-only fields
of SuggestionItem are dropped. A custom renderer and a
TriggerSuggestionConfig.onRemove handler read the item back from
what is left.

## Signature

```ts
interface TokenChipAttrs
```

## Members

### data

`data?: unknown`

Custom fields carried over from the selected item. Everything the
suggestion item held beyond `id`, `label`, `value`, `avatar`,
`description`, `disabled`, and `showTriggerInChip` lands here, so it
survives a round trip through the editor's JSON.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.TokenChipAttrs.html#data)

### id

`id?: string`

Identifier of the item the chip came from.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.TokenChipAttrs.html#id)

### label

`label?: string`

Text shown on the chip.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.TokenChipAttrs.html#label)

### trigger

`trigger?: string`

Trigger character to prefix onto the default chip text (e.g.
`/summarize` vs `summarize`). Set at insert time by
`resolveShowTriggerInChip` — defaults to command nodes only, but is
overridable per-config or per-item via `TriggerSuggestionConfig`/
`SuggestionItem`'s `showTriggerInChip`.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.TokenChipAttrs.html#trigger)

### value

`value?: string`

String the chip contributes to the message text. Falls back to `label`
when unset.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.TokenChipAttrs.html#value)

## Related

- [RenderTokenChipArgs.attrs](./RenderTokenChipArgs.md)
- [SuggestionItem](./SuggestionItem.md)
- [TriggerSuggestionConfig.onRemove](./TriggerSuggestionConfig.md)
