# MarkdownRendererImageArgs

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.MarkdownRendererImageArgs.html

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

The image's `alt` text, when present.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.MarkdownRendererImageArgs.html#alt)

### attributes

`attributes: Record<string, string>`

The image's parsed attributes (post-sanitize), as a plain object.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.MarkdownRendererImageArgs.html#attributes)

### src

`src: string`

Resolved `src` of the image.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.MarkdownRendererImageArgs.html#src)

### title

`title?: string`

The image's `title` attribute, when present.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.MarkdownRendererImageArgs.html#title)

### token

`token: Readonly<Token>`

The markdown-it `image` `Token`.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.MarkdownRendererImageArgs.html#token)

## Related

- [CustomMarkdownRenderers.image](./CustomMarkdownRenderers.md)
- [WCCustomMarkdownRenderers.image](./WCCustomMarkdownRenderers.md)
