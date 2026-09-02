# MarkdownRendererChecklistItemArgs

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.MarkdownRendererChecklistItemArgs.html

Render-time identity + state for a checklist item, passed to
`checklist.getChecked`.

## Signature

```ts
interface MarkdownRendererChecklistItemArgs
```

## Members

### checked

`checked: boolean`

The checkbox state parsed from the markdown (`[x]` / `[ ]`).

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.MarkdownRendererChecklistItemArgs.html#checked)

### id

`id: string`

Stable identity for the item — the source line of its list item. Stable
across re-renders while earlier lines don't shift.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.MarkdownRendererChecklistItemArgs.html#id)

### label

`label: string`

The item's text.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.MarkdownRendererChecklistItemArgs.html#label)

### token

`token: Readonly<Token>`

The markdown-it checkbox `Token`.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.MarkdownRendererChecklistItemArgs.html#token)
