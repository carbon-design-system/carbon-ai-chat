# RenderUserDefinedResponse

- Kind: TypeAlias
- Category: React
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/types/Type_reference.RenderUserDefinedResponse.html

The type of the render function that is used to render user defined responses. This function should return a
component that renders the display for the message contained in the given event.

## Signature

```ts
type RenderUserDefinedResponse = (state: RenderUserDefinedState, instance: ChatInstance) => ReactNode
```
