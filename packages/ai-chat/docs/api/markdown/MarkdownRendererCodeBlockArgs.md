# MarkdownRendererCodeBlockArgs

**Experimental.**

- Kind: TypeAlias
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/types/Type_reference.MarkdownRendererCodeBlockArgs.html

Argument passed to the fenced code-block renderer callbacks on
CustomMarkdownRenderers.codeBlock and
WCCustomMarkdownRenderers.codeBlock. Extends
MarkdownRendererCodeBlockData with the source token, full
TokenTree node, and a stable `slotName` suitable for use as a key.

## Signature

```ts
type MarkdownRendererCodeBlockArgs = _MarkdownRendererCodeBlockArgs
```

## Related

- [CustomMarkdownRenderers.codeBlock](./CustomMarkdownRenderers.md)
- [MarkdownRendererCodeBlockData](./MarkdownRendererCodeBlockData.md)
- [TokenTree](./TokenTree.md)
- [WCCustomMarkdownRenderers.codeBlock](./WCCustomMarkdownRenderers.md)
