# MarkdownCustomRendererMountDetail

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.20.0/docs/interfaces/Type_reference.MarkdownCustomRendererMountDetail.html

Payload of the `cds-aichat-markdown-plugin-host-mount` event when the
markdown element hands over a live `customRenderers` host.

Claiming it means re-parenting
MarkdownCustomRendererMountDetail.element into your own light DOM,
synchronously, and nothing else: never rewrite its content, never style it,
never remove it. The markdown element owns that node across renders and
renders the `<slot>` hop that projects it back.

## Signature

```ts
interface MarkdownCustomRendererMountDetail
```

## Members

### element

`element: HTMLElement`

The host to re-parent. The markdown element created it, replaces its
children on every render, and removes it when the renderer stops matching
— a claimant only moves it.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0/docs/interfaces/Type_reference.MarkdownCustomRendererMountDetail.html#element)

### isInline

`isInline: boolean`

True when the claimed output is inline flow content. Always `false` here:
the markdown element hosts every `customRenderers` result in a `<div>` it
created, so a claimant has no host tag to choose. Declared on both members
so a listener can read it before narrowing on `kind`.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0/docs/interfaces/Type_reference.MarkdownCustomRendererMountDetail.html#isinline)

### kind

`kind: "customRenderer"`

Marks the payload as a live element rather than an HTML string.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0/docs/interfaces/Type_reference.MarkdownCustomRendererMountDetail.html#kind)

### slotName

`slotName: string`

Name already set on `element`'s `slot` attribute, and the key the matching
`-unmount` event arrives under. Page-unique, reused across renders and
opaque, like the plugin-fallback name. No `-update` event follows this
one: the markdown element writes the consumer's node into `element`
itself.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0/docs/interfaces/Type_reference.MarkdownCustomRendererMountDetail.html#slotname)

## Related

- [MarkdownCustomRendererMountDetail.element](./MarkdownCustomRendererMountDetail.md)
