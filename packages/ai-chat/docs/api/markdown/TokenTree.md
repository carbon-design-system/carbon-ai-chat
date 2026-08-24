# TokenTree

**Experimental.**

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.TokenTree.html

Markdown-it parser node tree, surfaced on the `node` field of
MarkdownRendererTableArgs and MarkdownRendererCodeBlockArgs
so custom renderers can inspect the parsed token structure when the
high-level data payload isn't enough.

## Signature

```ts
interface TokenTree
```

## Members

### children

`children: TokenTree[]`

**Experimental.**

Child nodes for nested content

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.TokenTree.html#children)

### key

`key: string`

**Experimental.**

Unique identifier for this node, used for efficient diffing

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.TokenTree.html#key)

### token

`token: Partial<Token>`

**Experimental.**

The original markdown-it token data

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.TokenTree.html#token)

## Related

- [MarkdownRendererCodeBlockArgs](./MarkdownRendererCodeBlockArgs.md)
- [MarkdownRendererTableArgs](./MarkdownRendererTableArgs.md)
