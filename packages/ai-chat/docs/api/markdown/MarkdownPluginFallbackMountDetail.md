# MarkdownPluginFallbackMountDetail

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.20.0/docs/interfaces/Type_reference.MarkdownPluginFallbackMountDetail.html

Payload of the `cds-aichat-markdown-plugin-host-mount` event when the
markdown element hands over plugin output as an HTML string.

Claiming the offer means calling `preventDefault()` on the event and
appending a host carrying MarkdownPluginFallbackMountDetail.html to
a tree the page's own stylesheet can reach. Only a container hosting
markdown output on the element's behalf needs this; application code does
not.

## Signature

```ts
interface MarkdownPluginFallbackMountDetail
```

## Members

### html

`html: string`

The plugin rule's rendered HTML, to assign to the host's `innerHTML`.

DOMPurify runs over it only when the markdown element has `sanitize-html`
set, and that setting is off by default. `remove-html` does not stand in
for it either — that one escapes HTML written in the markdown source and
never filters what a plugin's renderer rule emits. Treat the string as
exactly as trustworthy as the markdown-it plugins the page registered.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0/docs/interfaces/Type_reference.MarkdownPluginFallbackMountDetail.html#html)

### isInline

`isInline: boolean`

True when the plugin's token is inline, such as a `math_inline` span.
Picks the host tag — `span` when true, so the output stays in paragraph
flow, `div` when false — and gates the block spacing that matches the
markdown element's own stack gap.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0/docs/interfaces/Type_reference.MarkdownPluginFallbackMountDetail.html#isinline)

### kind

`kind: "pluginFallback"`

Marks the payload as an HTML string rather than a live element.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0/docs/interfaces/Type_reference.MarkdownPluginFallbackMountDetail.html#kind)

### slotName

`slotName: string`

Name to put on the host's `slot` attribute, and the key the matching
`-update` and `-unmount` events arrive under. Unique across every markdown
element on the page, and reused across renders while the token stays put,
so a streaming message rewrites one host instead of growing a new one per
chunk. Treat the value as opaque; its format is not part of the API.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0/docs/interfaces/Type_reference.MarkdownPluginFallbackMountDetail.html#slotname)

## Related

- [MarkdownPluginFallbackMountDetail.html](./MarkdownPluginFallbackMountDetail.md)
