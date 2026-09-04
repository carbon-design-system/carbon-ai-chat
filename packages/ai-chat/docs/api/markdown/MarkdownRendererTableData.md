# MarkdownRendererTableData

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.MarkdownRendererTableData.html

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

Cells extracted from the table's `<thead>`, in column order.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.MarkdownRendererTableData.html#headers)

### isLoading

`isLoading: boolean`

True when the table should render its skeleton/loading state instead of
cell data — set by the component while a streaming table sits at the tail
of the message and the next chunk may still add rows.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.MarkdownRendererTableData.html#isloading)

### isStreaming

`isStreaming: boolean`

True while the chat is still receiving chunks of the message this table
belongs to.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.MarkdownRendererTableData.html#isstreaming)

### rows

`rows: TableCellData[][]`

Body rows, each an array of cells in column order.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.MarkdownRendererTableData.html#rows)

## Related

- [MarkdownRendererTableArgs](./MarkdownRendererTableArgs.md)
