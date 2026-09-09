# BuildCarbonExtensionsConfig

- Kind: Interface
- Category: Utilities
- Reference: https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.BuildCarbonExtensionsConfig.html

The input configs buildCarbonExtensions turns into Tiptap
extensions. Each field mirrors the matching one on InputConfig;
leave a field out to leave its extension out.

## Signature

```ts
interface BuildCarbonExtensionsConfig
```

## Members

### autocomplete

`autocomplete?: AutocompleteConfig`

Config for live autocomplete. Builds carbonAutocomplete, set to
stand down for whichever mention and command triggers you also pass.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.BuildCarbonExtensionsConfig.html#autocomplete)

### command

`command?: TriggerSuggestionConfig`

Config for the `/`-style command picker. Builds carbonCommand.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.BuildCarbonExtensionsConfig.html#command)

### mention

`mention?: TriggerSuggestionConfig`

Config for the `@`-style mention picker. Builds carbonMention.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.BuildCarbonExtensionsConfig.html#mention)

### starters

`starters?: StartersConfig`

Config for the starter prompts shown while the editor is empty and
focused. Builds carbonStarterTrigger. An empty `items` list still
installs the extension, so you can fill the list later without
recreating the editor.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.BuildCarbonExtensionsConfig.html#starters)

## Related

- [InputConfig](./InputConfig.md)
- [buildCarbonExtensions](./buildCarbonExtensions.md)
