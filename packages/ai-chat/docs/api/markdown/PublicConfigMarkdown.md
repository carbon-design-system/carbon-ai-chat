# PublicConfigMarkdown

**Experimental.**

- Kind: Interface
- Category: Config
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PublicConfigMarkdown.html

Framework-neutral markdown configuration shared by the React `ChatContainer`
and the `cds-aichat-container` web component. Each layer extends this with
its own `customRenderers` member returning the layer-appropriate type
(`ReactNode` vs `HTMLElement | null`).

## Signature

```ts
interface PublicConfigMarkdown
```

## Members

### markdownItPlugins

`markdownItPlugins?: MarkdownItPlugin[]`

**Experimental.**

Markdown-it plugins applied after the built-in plugins
(markdown-it-attrs, markdown-it-highlight, markdown-it-task-lists).
Memoize this array — a new reference each render rebuilds the
markdown-it instance.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PublicConfigMarkdown.html#markdownitplugins)
