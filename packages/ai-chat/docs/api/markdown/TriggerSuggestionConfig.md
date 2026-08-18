# TriggerSuggestionConfig

- Kind: TypeAlias
- Category: Config
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0-rc.1/docs/types/Type_reference.TriggerSuggestionConfig.html

Trigger-character-driven suggestion config consumed by
InputConfig.mention and InputConfig.command. Adds the
trigger character, an optional `triggerPosition`, an optional schema-node
`name` override, a custom-token renderer, an `onRemove` callback (the
mirror of `onSelect`, fired when a token is deleted), and a
`showTriggerInChip` default (whether selected items render as
`/summarize` or a bare `summarize`, overridable per item) on top of
BaseSuggestionConfig.

## Signature

```ts
type TriggerSuggestionConfig = _TriggerSuggestionConfig
```

## Related

- [BaseSuggestionConfig](./BaseSuggestionConfig.md)
- [InputConfig.command](./InputConfig.md)
- [InputConfig.mention](./InputConfig.md)
