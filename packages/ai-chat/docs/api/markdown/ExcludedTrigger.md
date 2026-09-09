# ExcludedTrigger

- Kind: Interface
- Category: Utilities
- Reference: https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.ExcludedTrigger.html

A trigger character that carbonAutocomplete stands down for, passed
as its second argument. Use it when autocomplete runs alongside a mention
or command picker, so the picker wins while its trigger is active.
buildCarbonExtensions assembles this list for you.

## Signature

```ts
interface ExcludedTrigger
```

## Members

### char

`char: string`

The character to stand down for, such as `"@"` or `"/"`.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.ExcludedTrigger.html#char)

### position

`position: "start" | "anywhere"`

Where that character has to sit. `"anywhere"` stands down for any word
starting with it; `"start"` stands down only when that word starts the
line. Mirrors the picker's own
TriggerSuggestionConfig.triggerPosition.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.ExcludedTrigger.html#position)

## Related

- [buildCarbonExtensions](./buildCarbonExtensions.md)
- [carbonAutocomplete](./carbonAutocomplete.md)
