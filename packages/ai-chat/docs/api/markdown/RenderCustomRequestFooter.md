<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# RenderCustomRequestFooter

- Kind: TypeAlias
- Category: React
- Reference: https://chat.carbondesignsystem.com/version/v1.22.0-rc.0/docs/types/Type_reference.RenderCustomRequestFooter.html

The type of the render function that is used to render a custom footer below a user message. This function should
return a component that renders the footer, or null to render nothing.

Passing this function is how you opt in. Leave it off and user messages have no footer, which is why it is separate
from RenderCustomMessageFooter rather than part of it.

## Signature

```ts
type RenderCustomRequestFooter = (slotName: string, message: MessageRequest, instance: ChatInstance) => ReactNode | null
```

## Related

- [RenderCustomMessageFooter](./RenderCustomMessageFooter.md)
