<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# ChatContainerPropsMarkdown

- Kind: Interface
- Category: React
- Reference: https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/interfaces/Type_reference.ChatContainerPropsMarkdown.html

React-layer `markdown` config — extends PublicConfigMarkdown with
React renderers.

## Signature

```ts
interface ChatContainerPropsMarkdown
```

## Members

### customRenderers

`customRenderers?: CustomMarkdownRenderers`

Per-element renderer overrides — see CustomMarkdownRenderers.
Pass a stable reference (`useMemo`) — an inline object literal will be a
fresh reference each render.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/interfaces/Type_reference.ChatContainerPropsMarkdown.html#customrenderers)

### markdownItPlugins

`markdownItPlugins?: MarkdownItPlugin[]`

Markdown-it plugins applied after the built-in plugins
(markdown-it-attrs, markdown-it-highlight, markdown-it-task-lists).
Memoize this array — a new reference each render rebuilds the
markdown-it instance.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/interfaces/Type_reference.ChatContainerPropsMarkdown.html#markdownitplugins)

## Related

- [PublicConfigMarkdown](./PublicConfigMarkdown.md)
