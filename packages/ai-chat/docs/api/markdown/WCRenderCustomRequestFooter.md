<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# WCRenderCustomRequestFooter

- Kind: TypeAlias
- Category: Web component
- Reference: https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/types/Type_reference.WCRenderCustomRequestFooter.html

The render function used to render a custom footer below a user message in web components. When provided, the
library manages all event listening, slot tracking, and element lifecycle. The callback receives the accumulated
state and should return an HTMLElement to display, or null to render nothing.

Passing this function is how you opt in. Leave it off and user messages have no footer.

This runs on every render, so return the same element for a given `slotName` each time. A fresh element replaces
the node in the DOM, which re-mounts your footer and fires `disconnectedCallback` on a custom element. Cache the
element per slot and update its properties instead.

This is the web component analogue of RenderCustomRequestFooter.

## Signature

```ts
type WCRenderCustomRequestFooter = (state: RenderCustomRequestFooterState, instance: ChatInstance) => HTMLElement | null
```

## Related

- [RenderCustomRequestFooter](./RenderCustomRequestFooter.md)
