# MarkdownRendererTableArgs

**Experimental.**

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererTableArgs.html

Argument passed to the markdown table renderer callbacks on
CustomMarkdownRenderers.table and
WCCustomMarkdownRenderers.table. Extends
MarkdownRendererTableData with the source token, full
TokenTree node, and a `slotName` that is stable across renders and
unique across every rendered markdown block on the page, so it is safe to
use as a key. Treat the value as opaque; its format is not part of the API.

## Signature

```ts
interface MarkdownRendererTableArgs
```

## Members

### headers

`headers: TableCellData[]`

**Experimental.**

Cells extracted from the table's `<thead>`, in column order.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererTableArgs.html#headers)

### isLoading

`isLoading: boolean`

**Experimental.**

True when the table should render its skeleton/loading state instead of
cell data — set by the component while a streaming table sits at the tail
of the message and the next chunk may still add rows.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererTableArgs.html#isloading)

### isStreaming

`isStreaming: boolean`

**Experimental.**

True while the chat is still receiving chunks of the message this table
belongs to.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererTableArgs.html#isstreaming)

### node

`node: Readonly<TokenTree>`

**Experimental.**

The full token-tree node, including descendants.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererTableArgs.html#node)

### rows

`rows: TableCellData[][]`

**Experimental.**

Body rows, each an array of cells in column order.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererTableArgs.html#rows)

### slotName

`slotName: string`

**Experimental.**

Stable slot identifier for this rendered element. Unique across every
markdown element on the page, and reused across renders — including
streaming chunks — while the underlying source line stays put, which makes
it a safe React key. Treat the value as opaque; its format is not part of
the API.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererTableArgs.html#slotname)

### token

`token: Readonly<Token>`

**Experimental.**

The markdown-it `Token` (a `table_open`) for the matched element — see
the `markdown-it` `Token` documentation for the field shape.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererTableArgs.html#token)

## Related

- [CustomMarkdownRenderers.table](./CustomMarkdownRenderers.md)
- [MarkdownRendererTableData](./MarkdownRendererTableData.md)
- [TokenTree](./TokenTree.md)
- [WCCustomMarkdownRenderers.table](./WCCustomMarkdownRenderers.md)
