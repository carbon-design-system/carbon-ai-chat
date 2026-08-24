# MarkdownRendererChecklistItemArgs

**Experimental.**

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererChecklistItemArgs.html

Render-time identity + state for a checklist item, passed to
`checklist.getChecked`.

## Signature

```ts
interface MarkdownRendererChecklistItemArgs
```

## Members

### checked

`checked: boolean`

**Experimental.**

The checkbox state parsed from the markdown (`[x]` / `[ ]`).

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererChecklistItemArgs.html#checked)

### id

`id: string`

**Experimental.**

Stable identity for the item — the source line of its list item. Stable
across re-renders while earlier lines don't shift.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererChecklistItemArgs.html#id)

### label

`label: string`

**Experimental.**

The item's text.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererChecklistItemArgs.html#label)

### node

`node: Readonly<TokenTree>`

**Experimental.**

The full token-tree node.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererChecklistItemArgs.html#node)

### token

`token: Readonly<Token>`

**Experimental.**

The markdown-it checkbox `Token`.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererChecklistItemArgs.html#token)
