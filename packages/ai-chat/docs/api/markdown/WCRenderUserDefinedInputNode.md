<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# WCRenderUserDefinedInputNode

**Experimental.**

- Kind: TypeAlias
- Category: Web component
- Reference: https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/types/Type_reference.WCRenderUserDefinedInputNode.html

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
