# WCMarkdown

- Kind: Interface
- Category: Web component
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0-rc.0/docs/interfaces/Type_reference.WCMarkdown.html

Web-component-layer `markdown` config — extends PublicConfigMarkdown
with renderers returning `HTMLElement` (or `null`).

## Signature

```ts
interface WCMarkdown
```

## Members

### customRenderers

`customRenderers?: WCCustomMarkdownRenderers`

Per-element renderer overrides — see WCCustomMarkdownRenderers.
Return the same element reference across renders to avoid unnecessary DOM
churn.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0-rc.0/docs/interfaces/Type_reference.WCMarkdown.html#customrenderers)

### markdownItPlugins

`markdownItPlugins?: MarkdownItPlugin[]`

Markdown-it plugins applied after the built-in plugins
(markdown-it-attrs, markdown-it-highlight, markdown-it-task-lists).
Memoize this array — a new reference each render rebuilds the
markdown-it instance.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0-rc.0/docs/interfaces/Type_reference.WCMarkdown.html#markdownitplugins)

## Related

- [PublicConfigMarkdown](./PublicConfigMarkdown.md)
