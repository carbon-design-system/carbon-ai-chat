# ChatContainerPropsMarkdown

**Experimental.**

- Kind: Interface
- Category: React
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatContainerPropsMarkdown.html

React-layer `markdown` config — extends PublicConfigMarkdown with
React renderers.

## Signature

```ts
interface ChatContainerPropsMarkdown
```

## Members

### customRenderers

`customRenderers?: CustomMarkdownRenderers`

**Experimental.**

Per-element renderer overrides — see CustomMarkdownRenderers.
Pass a stable reference (`useMemo`) — an inline object literal will be a
fresh reference each render.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatContainerPropsMarkdown.html#customrenderers)

### markdownItPlugins

`markdownItPlugins?: MarkdownItPlugin[]`

**Experimental.**

Markdown-it plugins applied after the built-in plugins
(markdown-it-attrs, markdown-it-highlight, markdown-it-task-lists).
Memoize this array — a new reference each render rebuilds the
markdown-it instance.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatContainerPropsMarkdown.html#markdownitplugins)

## Related

- [PublicConfigMarkdown](./PublicConfigMarkdown.md)
