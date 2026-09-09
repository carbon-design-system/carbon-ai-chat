# MarkdownRendererLinkArgs

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.MarkdownRendererLinkArgs.html

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

The link's parsed attributes (post-sanitize), as a plain object.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.MarkdownRendererLinkArgs.html#attributes)

### href

`href: string`

Resolved `href` of the link (may be a linkified bare URL).

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.MarkdownRendererLinkArgs.html#href)

### text

`text: string`

Plain text of the link's rendered children, a convenience for
context-aware rewrites. The rich children render regardless of this value.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.MarkdownRendererLinkArgs.html#text)

### title

`title?: string`

The link's `title` attribute, when present.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.MarkdownRendererLinkArgs.html#title)

### token

`token: Readonly<Token>`

The markdown-it `link_open` `Token`.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.MarkdownRendererLinkArgs.html#token)

## Related

- [CustomMarkdownRenderers.link](./CustomMarkdownRenderers.md)
- [WCCustomMarkdownRenderers.link](./WCCustomMarkdownRenderers.md)
