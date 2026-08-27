# MarkdownRendererImageArgs

**Experimental.**

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererImageArgs.html

Argument passed to an CustomMarkdownRenderers.image /
WCCustomMarkdownRenderers.image callback — the parsed image data
(src, alt, title, attributes) plus the source token and node.

## Signature

```ts
interface MarkdownRendererImageArgs
```

## Members

### alt

`alt?: string`

**Experimental.**

The image's `alt` text, when present.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererImageArgs.html#alt)

### attributes

`attributes: Record<string, string>`

**Experimental.**

The image's parsed attributes (post-sanitize), as a plain object.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererImageArgs.html#attributes)

### node

`node: Readonly<TokenTree>`

**Experimental.**

The full token-tree node.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererImageArgs.html#node)

### src

`src: string`

**Experimental.**

Resolved `src` of the image.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererImageArgs.html#src)

### title

`title?: string`

**Experimental.**

The image's `title` attribute, when present.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererImageArgs.html#title)

### token

`token: Readonly<Token>`

**Experimental.**

The markdown-it `image` `Token`.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererImageArgs.html#token)

## Related

- [CustomMarkdownRenderers.image](./CustomMarkdownRenderers.md)
- [WCCustomMarkdownRenderers.image](./WCCustomMarkdownRenderers.md)
