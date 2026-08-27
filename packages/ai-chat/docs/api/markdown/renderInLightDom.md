# renderInLightDom

- Kind: Function
- Category: Utilities
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/functions/Type_reference.renderInLightDom.html

Bridge an element (or React node) built inside the shadow-DOM editor into
the page's LIGHT DOM, where the host's stylesheet applies. Intended for
host-authored Tiptap `addNodeView` node views: build your DOM however you
like, pass it to `renderInLightDom`, and return the resulting `container`
as the node view `dom`. The chat's portal container projects the content
back into position via a `<slot>`. `renderTokenChip` is a token-specific
wrapper over this primitive.

## Signature

```ts
renderInLightDom(args: RenderInLightDomArgs): RenderInLightDomResult
```
