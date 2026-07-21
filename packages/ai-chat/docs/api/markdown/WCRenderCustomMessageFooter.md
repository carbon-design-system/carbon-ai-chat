# WCRenderCustomMessageFooter

- Kind: TypeAlias
- Category: Web component
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/types/Type_reference.WCRenderCustomMessageFooter.html

The render function used to render a custom message footer in web
components. When provided, the library manages all event listening, slot
tracking, and element lifecycle. The callback receives the accumulated state
and should return an HTMLElement to display, or null to render nothing.

This is the web component analogue of RenderCustomMessageFooter and
mirrors the contract of WCRenderUserDefinedResponse.

## Signature

```ts
type WCRenderCustomMessageFooter = (state: RenderCustomMessageFooterState, instance: ChatInstance) => HTMLElement | null
```

## Related

- [RenderCustomMessageFooter](./RenderCustomMessageFooter.md)
- [WCRenderUserDefinedResponse](./WCRenderUserDefinedResponse.md)
