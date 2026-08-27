# MarkdownRendererTableData

**Experimental.**

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererTableData.html

Parsed table payload extended by MarkdownRendererTableArgs — the
argument shape the table renderer callback actually receives. Carries the
headers, rows, and streaming/loading flags.

## Signature

```ts
interface MarkdownRendererTableData
```

## Members

### headers

`headers: TableCellData[]`

**Experimental.**

Cells extracted from the table's `<thead>`, in column order.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererTableData.html#headers)

### isLoading

`isLoading: boolean`

**Experimental.**

True when the table should render its skeleton/loading state instead of
cell data — set by the component while a streaming table sits at the tail
of the message and the next chunk may still add rows.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererTableData.html#isloading)

### isStreaming

`isStreaming: boolean`

**Experimental.**

True while the chat is still receiving chunks of the message this table
belongs to.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererTableData.html#isstreaming)

### rows

`rows: TableCellData[][]`

**Experimental.**

Body rows, each an array of cells in column order.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererTableData.html#rows)

## Related

- [MarkdownRendererTableArgs](./MarkdownRendererTableArgs.md)
