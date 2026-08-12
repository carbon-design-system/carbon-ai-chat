# MarkdownRendererLinkResult

**Experimental.**

- Kind: TypeAlias
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0-rc.1/docs/types/Type_reference.MarkdownRendererLinkResult.html

Attribute overrides returned by a CustomMarkdownRenderers.link /
WCCustomMarkdownRenderers.link callback. Fields left `undefined` keep
the framework default; returning `null` from the callback skips the override
entirely. Supply `onClick` to intercept link clicks.

## Signature

```ts
type MarkdownRendererLinkResult = _MarkdownRendererLinkResult
```

## Related

- [CustomMarkdownRenderers.link](./CustomMarkdownRenderers.md)
- [WCCustomMarkdownRenderers.link](./WCCustomMarkdownRenderers.md)
