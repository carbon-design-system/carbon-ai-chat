<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# carbonStarterTrigger

- Kind: Function
- Category: Utilities
- Reference: https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/functions/Type_reference.carbonStarterTrigger.html

Tiptap extension factory for starter prompts shown while the editor is
empty + focused + editable. Selection inserts the item's `value` (or
`label`) and auto-sends in the same turn. Items are stored on
`extension.storage.items` so the host can swap the list without
recreating the editor.

## Signature

```ts
carbonStarterTrigger(initialItems: SuggestionItem[], initialIsOn?: boolean): Extension
```
