<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# RenderCustomMessageFooter

- Kind: TypeAlias
- Category: React
- Reference: https://chat.carbondesignsystem.com/version/v1.22.0/docs/types/Type_reference.RenderCustomMessageFooter.html

The type of the render function that is used to render a custom footer. This function should return a
component that renders the custom message footer.

## Signature

```ts
type RenderCustomMessageFooter = (slotName: string, message: MessageResponse, messageItem: GenericItem, instance: ChatInstance, additionalData?: Record<string, unknown>) => ReactNode | null
```
