# MarkdownCustomRenderers

**Experimental.**

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownCustomRenderers.html

Framework-neutral per-element renderer overrides accepted by the
underlying `cds-aichat-markdown` element. The React variant
CustomMarkdownRenderers and the web-component variant
WCCustomMarkdownRenderers extend this contract with their layer's
return type. Application code typically uses one of those variants rather
than this baseline directly.

## Signature

```ts
interface MarkdownCustomRenderers
```

## Members

### checklist

`checklist?: MarkdownRendererChecklist`

**Experimental.**

Make task-list checkboxes actionable. See MarkdownRendererChecklist.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownCustomRenderers.html#checklist)

### codeBlock

`codeBlock?: (args: MarkdownRendererCodeBlockArgs) => HTMLElement`

**Experimental.**

Override the default `cds-aichat-code-snippet` rendering.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownCustomRenderers.html#codeblock)

### image

`image?: (args: MarkdownRendererImageArgs) => MarkdownRendererImageResult`

**Experimental.**

Transform how images render. Receives the parsed image data and returns
attribute overrides (`src`, extra `attributes`), or `null` to keep the
defaults.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownCustomRenderers.html#image)

### link

`link?: (args: MarkdownRendererLinkArgs) => MarkdownRendererLinkResult`

**Experimental.**

Transform how links render. Receives the parsed link data and returns
attribute overrides (`href`, `target`, `rel`, extra `attributes`), or
`null` to keep the defaults. The framework renders the `<a>` and its
children either way and keeps the `target="_blank"` safety default unless
overridden.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownCustomRenderers.html#link)

### table

`table?: (args: MarkdownRendererTableArgs) => HTMLElement`

**Experimental.**

Override the default `cds-aichat-table` rendering.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownCustomRenderers.html#table)

## Related

- [CustomMarkdownRenderers](./CustomMarkdownRenderers.md)
- [WCCustomMarkdownRenderers](./WCCustomMarkdownRenderers.md)
