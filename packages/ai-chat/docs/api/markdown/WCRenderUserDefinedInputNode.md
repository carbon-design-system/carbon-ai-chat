# WCRenderUserDefinedInputNode

**Experimental.**

- Kind: TypeAlias
- Category: Web component
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/types/Type_reference.WCRenderUserDefinedInputNode.html

Web-component renderer for custom TipTap node types in user message
bubbles. Mirrors RenderUserDefinedInputNode but returns an
`HTMLElement` (or `null`). The library moves / removes the element as
messages mount and unmount.

## Signature

```ts
type WCRenderUserDefinedInputNode = (state: RenderUserDefinedInputNodeState, instance: ChatInstance) => HTMLElement | null
```

## Related

- [RenderUserDefinedInputNode](./RenderUserDefinedInputNode.md)
