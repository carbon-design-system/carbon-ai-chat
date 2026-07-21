# WCRenderUserDefinedResponse

- Kind: TypeAlias
- Category: Web component
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/types/Type_reference.WCRenderUserDefinedResponse.html

The type of the render function used to render user defined responses in web components.
This function should return an HTMLElement to display for the given user defined state,
or null to render nothing.

The callback is invoked on every state update (new chunk, complete item, full message).
If you return the same element reference, the DOM is not disturbed. If you return a
new element, the previous content is replaced.

## Signature

```ts
type WCRenderUserDefinedResponse = (state: RenderUserDefinedState, instance: ChatInstance) => HTMLElement | null
```
