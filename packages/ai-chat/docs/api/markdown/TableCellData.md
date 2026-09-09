# TableCellData

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.TableCellData.html

One cell of a parsed markdown table, as it arrives on
MarkdownRendererTableData.headers and
MarkdownRendererTableData.rows. Read `text` for the cell's plain
string, or walk `tokens` to render its inline markup yourself.

## Signature

```ts
interface TableCellData
```

## Members

### text

`text: string`

Plain text of the cell, with markdown syntax stripped.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.TableCellData.html#text)

### tokens

`tokens: TokenTree[]`

Token tree for the cell's content, or `null` when the cell is plain
text. Render it to keep the links, code spans, and emphasis that `text`
drops.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.TableCellData.html#tokens)

## Related

- [MarkdownRendererTableArgs.headers](./MarkdownRendererTableArgs.md)
- [MarkdownRendererTableArgs.rows](./MarkdownRendererTableArgs.md)
