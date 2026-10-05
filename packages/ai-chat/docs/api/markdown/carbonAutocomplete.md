<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# carbonAutocomplete

- Kind: Function
- Category: Utilities
 The prompt-line extension surface is still settling; these
factory signatures can change in a minor release.
- Reference: https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/functions/Type_reference.carbonAutocomplete.html

Tiptap extension factory for live autocomplete. Wraps `@tiptap/suggestion`
directly (no Mention node), and activates whenever the input has any
non-empty trailing word.

The extension reports the trigger and nothing else: it resolves no items
and inserts no text. Configure autocomplete through
InputConfig.autocomplete, which the chat's autocomplete controller
reads.

## Signature

```ts
carbonAutocomplete(excludeTriggers?: ExcludedTrigger[]): Extension
```

## Related

- [InputConfig.autocomplete](./InputConfig.md)
