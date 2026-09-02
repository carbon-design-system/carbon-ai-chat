# removeNodesByType

- Kind: Function
- Category: Utilities
- Reference: https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/functions/Type_reference.removeNodesByType.html

Return a new Tiptap `JSONContent` tree with every node whose `type` matches
one of `types` removed. Marks on text nodes are preserved.

## Signature

```ts
removeNodesByType(json: JSONContent, types: string[]): JSONContent
```
