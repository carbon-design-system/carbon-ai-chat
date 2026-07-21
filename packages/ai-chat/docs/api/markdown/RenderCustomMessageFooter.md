# RenderCustomMessageFooter

- Kind: TypeAlias
- Category: React
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/types/Type_reference.RenderCustomMessageFooter.html

The type of the render function that is used to render a custom footer. This function should return a
component that renders the custom message footer.

## Signature

```ts
type RenderCustomMessageFooter = (slotName: string, message: MessageResponse, messageItem: GenericItem, instance: ChatInstance, additionalData?: Record<string, unknown>) => ReactNode | null
```
