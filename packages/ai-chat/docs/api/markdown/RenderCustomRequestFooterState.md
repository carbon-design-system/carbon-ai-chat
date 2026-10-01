<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# RenderCustomRequestFooterState

- Kind: Interface
- Category: Web component
- Reference: https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/interfaces/Type_reference.RenderCustomRequestFooterState.html

The accumulated state for one custom footer slot below a user message, passed to the web component
WCRenderCustomRequestFooter callback.

## Signature

```ts
interface RenderCustomRequestFooterState
```

## Members

### message

`message: MessageRequest`

The message as the user submitted it, which is what the bubble on screen shows. A
BusEventType.PRE_SEND handler runs later and may rewrite the text the assistant receives, so this can
differ from what was sent.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/interfaces/Type_reference.RenderCustomRequestFooterState.html#message)

### slotName

`slotName: string`

The unique identifier for this footer slot. Treat it as opaque: it is a key for your render function, not a
reference you can parse. It is also regenerated when the chat restores a message from history, so don't key
durable state off it.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/interfaces/Type_reference.RenderCustomRequestFooterState.html#slotname)

## Related

- [WCRenderCustomRequestFooter](./WCRenderCustomRequestFooter.md)
