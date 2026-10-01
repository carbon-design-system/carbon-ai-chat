<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# ExcludedTrigger

**Experimental.**

- Kind: Interface
- Category: Utilities
 The prompt-line extension surface is still settling; these
factory signatures can change in a minor release.
- Reference: https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/interfaces/Type_reference.ExcludedTrigger.html

A trigger character that carbonAutocomplete stands down for, passed
as its only argument. Use it when autocomplete runs alongside a mention
or command picker, so the picker wins while its trigger is active.
buildCarbonExtensions assembles this list for you.

## Signature

```ts
interface ExcludedTrigger
```

## Members

### char

`char: string`

**Experimental.**

The character to stand down for, such as `"@"` or `"/"`.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/interfaces/Type_reference.ExcludedTrigger.html#char)

### position

`position: "start" | "anywhere"`

**Experimental.**

Where that character has to sit. `"anywhere"` stands down for any word
starting with it; `"start"` stands down only when that word starts the
line. Mirrors the picker's own
TriggerSuggestionConfig.triggerPosition.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/interfaces/Type_reference.ExcludedTrigger.html#position)

## Related

- [buildCarbonExtensions](./buildCarbonExtensions.md)
- [carbonAutocomplete](./carbonAutocomplete.md)
