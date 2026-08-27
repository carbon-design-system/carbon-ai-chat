# mapNodes

- Kind: Function
- Category: Utilities
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/functions/Type_reference.mapNodes.html

Map every node in a Tiptap `JSONContent` tree through `fn`. Returning
`null` removes the node from its parent's `content`; returning a node
replaces it. The walk is post-order — children are visited before their
parents.

## Signature

```ts
mapNodes(json: JSONContent, fn: (node: JSONContent) => JSONContent): JSONContent
```
