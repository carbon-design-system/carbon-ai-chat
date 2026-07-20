# RenderCustomMessageFooterState

- Kind: Interface
- Category: Web component
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.RenderCustomMessageFooterState.html

The accumulated state for one custom message footer slot, passed to the
web component WCRenderCustomMessageFooter callback.

## Signature

```ts
interface RenderCustomMessageFooterState
```

## Members

### additionalData

`additionalData?: Record<string, unknown>`

Optional application data supplied with the footer slot.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.RenderCustomMessageFooterState.html#additionaldata)

### message

`message: MessageResponse`

The assistant response object that contains the messageItem.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.RenderCustomMessageFooterState.html#message)

### messageItem

`messageItem: GenericItem`

The message item that the footer is attached to.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.RenderCustomMessageFooterState.html#messageitem)

### slotName

`slotName: string`

The unique identifier for this footer slot.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.RenderCustomMessageFooterState.html#slotname)

## Related

- [WCRenderCustomMessageFooter](./WCRenderCustomMessageFooter.md)
