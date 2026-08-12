# MarkdownRendererTableArgs

- Kind: TypeAlias
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0-rc.1/docs/types/Type_reference.MarkdownRendererTableArgs.html

Argument passed to the markdown table renderer callbacks on
CustomMarkdownRenderers.table and
WCCustomMarkdownRenderers.table. Extends
MarkdownRendererTableData with the source markdown-it token and a
`slotName` that is stable across renders and unique across every rendered
markdown block on the page, so it is safe to use as a key. Treat the value
as opaque; its format is not part of the API.

## Signature

```ts
type MarkdownRendererTableArgs = _MarkdownRendererTableArgs
```

## Related

- [CustomMarkdownRenderers.table](./CustomMarkdownRenderers.md)
- [MarkdownRendererTableData](./MarkdownRendererTableData.md)
- [WCCustomMarkdownRenderers.table](./WCCustomMarkdownRenderers.md)
