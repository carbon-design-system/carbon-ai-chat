# SuggestionItem

- Kind: Interface
- Category: Config
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.SuggestionItem.html

Single list-item shape used by every Carbon suggestion surface
(mention, command, autocomplete, starters). Carries the id, label,
optional value override, optional description and avatar, and a
disabled flag. `showTriggerInChip` additionally controls, per item,
whether a mention/command selection renders with its trigger character —
chip-less surfaces (autocomplete, starters) ignore it.

## Signature

```ts
interface SuggestionItem
```

## Members

### avatar

`avatar?: string | ComponentType<any> | CarbonIcon`

Optional leading visual for the item.

Can be:
- a string URL for an avatar image
- an icon from `@carbon/icons` (CarbonIcon descriptor)
- a React icon component from `@carbon/icons-react`

React components are automatically transformed to CarbonIcon format when
rendered through the React wrapper.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.SuggestionItem.html#avatar)

### description

`description?: string`

Optional description shown below the label.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.SuggestionItem.html#description)

### disabled

`disabled?: boolean`

Whether the item is disabled and cannot be selected.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.SuggestionItem.html#disabled)

### id

`id: string`

Unique identifier for the item.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.SuggestionItem.html#id)

### label

`label: string`

Display label shown in the suggestion list.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.SuggestionItem.html#label)

### showTriggerInChip

`showTriggerInChip?: boolean`

Whether the trigger character prefixes this item's rendered chip (e.g.
`/summarize` instead of `summarize`). Only meaningful for items
selected through a mention/command picker — chip-less surfaces
(autocomplete, starters) ignore it. Overrides
TriggerSuggestionConfig.showTriggerInChip and the built-in
default (commands show their trigger, mentions don't) when set, so a
single `@` picker can mix items that read as a bare name (people) with
items that read as `@name` (files, agents, ...).

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.SuggestionItem.html#showtriggerinchip)

### value

`value?: string`

String value inserted into the message on selection. Defaults to label.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.SuggestionItem.html#value)
