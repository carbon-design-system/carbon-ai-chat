# MarkdownRendererCodeBlockArgs

- Kind: TypeAlias
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0-rc.1/docs/types/Type_reference.MarkdownRendererCodeBlockArgs.html

Argument passed to the fenced code-block renderer callbacks on
CustomMarkdownRenderers.codeBlock and
WCCustomMarkdownRenderers.codeBlock. Extends
MarkdownRendererCodeBlockData with the source markdown-it token and
a `slotName` that is stable across renders and unique across every rendered
markdown block on the page, so it is safe to use as a key. Treat the value
as opaque; its format is not part of the API.

## Signature

```ts
type MarkdownRendererCodeBlockArgs = _MarkdownRendererCodeBlockArgs
```

## Related

- [CustomMarkdownRenderers.codeBlock](./CustomMarkdownRenderers.md)
- [MarkdownRendererCodeBlockData](./MarkdownRendererCodeBlockData.md)
- [WCCustomMarkdownRenderers.codeBlock](./WCCustomMarkdownRenderers.md)
