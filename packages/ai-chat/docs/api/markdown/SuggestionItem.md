# SuggestionItem

- Kind: TypeAlias
- Category: Config
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0-rc.0/docs/types/Type_reference.SuggestionItem.html

Single list-item shape used by every Carbon suggestion surface
(mention, command, autocomplete, starters). Carries the id, label,
optional value override, optional description / avatar / icon, and a
disabled flag. `showTriggerInChip` additionally controls, per item,
whether a mention/command selection renders with its trigger character —
chip-less surfaces (autocomplete, starters) ignore it.

## Signature

```ts
type SuggestionItem = _SuggestionItem
```
