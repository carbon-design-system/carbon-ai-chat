# TokenTree

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.TokenTree.html

Markdown-it parser node tree, surfaced on the `node` field of
MarkdownRendererTableArgs and MarkdownRendererCodeBlockArgs,
and reached through TableCellData.tokens. Each node pairs a
markdown-it token with its children, so a custom renderer can inspect the
parsed token structure — or walk a table cell's inline content — when the
high-level data payload isn't enough.

## Signature

```ts
interface TokenTree
```

## Members

### children

`children: TokenTree[]`

Child nodes for nested content

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.TokenTree.html#children)

### key

`key: string`

Unique identifier for this node, used for efficient diffing

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.TokenTree.html#key)

### token

`token: Partial<Token>`

The original markdown-it token data

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.TokenTree.html#token)

## Related

- [MarkdownRendererCodeBlockArgs](./MarkdownRendererCodeBlockArgs.md)
- [MarkdownRendererTableArgs](./MarkdownRendererTableArgs.md)
- [TableCellData.tokens](./TableCellData.md)
