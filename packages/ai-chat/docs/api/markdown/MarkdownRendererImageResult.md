# MarkdownRendererImageResult

**Experimental.**

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererImageResult.html

Attribute overrides returned by an image renderer callback (`src`, extra
`attributes`). Return `null` to keep the defaults.

## Signature

```ts
interface MarkdownRendererImageResult
```

## Members

### attributes

`attributes?: Record<string, string>`

**Experimental.**

Extra attributes merged over the image's existing ones. Re-sanitized when
the element has HTML sanitization enabled.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererImageResult.html#attributes)

### src

`src?: string`

**Experimental.**

Replacement `src`.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererImageResult.html#src)
