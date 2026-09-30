<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# renderTokenChip

- Kind: Function
- Category: Utilities
- Reference: https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/functions/Type_reference.renderTokenChip.html

Build the carbon token chip element used by the editor's NodeView and by
the rich user message bubble. Honors a consumer-supplied
`renderCustomToken` and delegates the light-DOM portal handshake to
renderInLightDom when the renderer returns custom content. Shared
so editor chips and bubble chips render identically.

## Signature

```ts
renderTokenChip(args: RenderTokenChipArgs): HTMLElement
```

## Related

- [renderInLightDom](./renderInLightDom.md)
