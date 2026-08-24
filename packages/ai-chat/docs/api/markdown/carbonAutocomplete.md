# carbonAutocomplete

- Kind: Function
- Category: Utilities
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/functions/Type_reference.carbonAutocomplete.html

Tiptap extension factory for live autocomplete. Wraps `@tiptap/suggestion`
directly (no Mention node) — the `command` callback inserts plain text
rather than a schema node. Activates whenever the input has any non-empty
trailing word.

## Signature

```ts
carbonAutocomplete(config: BaseSuggestionConfig, excludeTriggers?: ExcludedTrigger[]): Extension
```
