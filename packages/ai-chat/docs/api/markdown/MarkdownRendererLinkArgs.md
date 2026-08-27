# MarkdownRendererLinkArgs

**Experimental.**

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererLinkArgs.html

Argument passed to a CustomMarkdownRenderers.link /
WCCustomMarkdownRenderers.link callback — the parsed link data
(href, title, text, attributes) plus the source token and node.

## Signature

```ts
interface MarkdownRendererLinkArgs
```

## Members

### attributes

`attributes: Record<string, string>`

**Experimental.**

The link's parsed attributes (post-sanitize), as a plain object.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererLinkArgs.html#attributes)

### href

`href: string`

**Experimental.**

Resolved `href` of the link (may be a linkified bare URL).

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererLinkArgs.html#href)

### node

`node: Readonly<TokenTree>`

**Experimental.**

The full token-tree node, including descendants.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererLinkArgs.html#node)

### text

`text: string`

**Experimental.**

Plain text of the link's rendered children, a convenience for
context-aware rewrites. The rich children render regardless of this value.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererLinkArgs.html#text)

### title

`title?: string`

**Experimental.**

The link's `title` attribute, when present.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererLinkArgs.html#title)

### token

`token: Readonly<Token>`

**Experimental.**

The markdown-it `link_open` `Token`.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererLinkArgs.html#token)

## Related

- [CustomMarkdownRenderers.link](./CustomMarkdownRenderers.md)
- [WCCustomMarkdownRenderers.link](./WCCustomMarkdownRenderers.md)
