<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# removeNodesByType

- Kind: Function
- Category: Utilities
- Reference: https://chat.carbondesignsystem.com/version/v1.22.0/docs/functions/Type_reference.removeNodesByType.html

Return a new Tiptap `JSONContent` tree with every node whose `type` matches
one of `types` removed. Marks on text nodes are preserved.

## Signature

```ts
removeNodesByType(json: JSONContent, types: string[]): JSONContent
```
