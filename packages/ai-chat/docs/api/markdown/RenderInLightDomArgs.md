# RenderInLightDomArgs

- Kind: Interface
- Category: Utilities
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.RenderInLightDomArgs.html

Args for renderInLightDom.

## Signature

```ts
interface RenderInLightDomArgs
```

## Members

### containerTag

`containerTag?: "div" | "span"`

Tag used for the shadow-side container AND the page-light-DOM host
element the portal creates. Defaults to `"span"`, which suits inline
content like a token chip. Use `"div"` when the projected content is
block-level (e.g. an atom-block Tiptap node containing a
`<cds-aichat-code-snippet>`) — a `<span>` wrapper would otherwise wrap a
`display: block` child in an inline line-box, adding the parent's
line-height as phantom leading.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.RenderInLightDomArgs.html#containertag)

### content

`content: HTMLElement | ReactNode`

Content to render in the page's light DOM. An `HTMLElement` is appended
directly. A `ReactNode` is `createPortal`-ed by the chat's React tree —
the same path the token `renderCustomToken` ReactNode case uses; it relies
on the host and chat sharing a single React instance.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.RenderInLightDomArgs.html#content)

### dispatchTarget

`dispatchTarget?: EventTarget`

Where to dispatch the handshake event. A host `addNodeView` should pass
`editor.view.dom` so the event reaches the listener on the chat wrapper.
Defaults to the returned `container` (the event bubbles and is composed).

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.RenderInLightDomArgs.html#dispatchtarget)

### fallback

`fallback?: HTMLElement`

Optional element shown inside the `<slot>` until the portal commits on the
next frame.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.RenderInLightDomArgs.html#fallback)

### meta

`meta?: Record<string, unknown>`

Opaque metadata forwarded verbatim in the event detail. The portal
container does not read it; listeners may.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.RenderInLightDomArgs.html#meta)

## Related

- [renderInLightDom](./renderInLightDom.md)
