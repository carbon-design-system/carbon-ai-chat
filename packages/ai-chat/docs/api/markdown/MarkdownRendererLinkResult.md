# MarkdownRendererLinkResult

**Experimental.**

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererLinkResult.html

Attribute overrides returned by a CustomMarkdownRenderers.link /
WCCustomMarkdownRenderers.link callback. Fields left `undefined` keep
the framework default; returning `null` from the callback skips the override
entirely. Supply `onClick` to intercept link clicks.

## Signature

```ts
interface MarkdownRendererLinkResult
```

## Members

### attributes

`attributes?: Record<string, string>`

**Experimental.**

Extra attributes merged over the link's existing ones. Re-sanitized when
the element has HTML sanitization enabled.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererLinkResult.html#attributes)

### href

`href?: string`

**Experimental.**

Replacement `href`.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererLinkResult.html#href)

### onClick

`onClick?: (event: MouseEvent) => void`

**Experimental.**

Click handler for the rendered `<a>` element. Call
`event.preventDefault()` to suppress the browser's default navigation.
Wired via `addEventListener` — never serialized as an HTML attribute and
unaffected by HTML sanitization.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererLinkResult.html#onclick)

### rel

`rel?: string`

**Experimental.**

Replacement `rel`.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererLinkResult.html#rel)

### target

`target?: string`

**Experimental.**

Replacement `target` (e.g. `"_self"`). Overrides the `_blank` default.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererLinkResult.html#target)

## Related

- [CustomMarkdownRenderers.link](./CustomMarkdownRenderers.md)
- [WCCustomMarkdownRenderers.link](./WCCustomMarkdownRenderers.md)
