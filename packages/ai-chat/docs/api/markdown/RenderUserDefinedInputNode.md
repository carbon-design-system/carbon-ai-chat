<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# RenderUserDefinedInputNode

**Experimental.**

- Kind: TypeAlias
- Category: React
- Reference: https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/types/Type_reference.RenderUserDefinedInputNode.html

React-side renderer for custom TipTap node types in user message bubbles.
Returned content mounts into LIGHT DOM so consumer stylesheets apply. The
library manages the slot lifecycle — register a renderer that returns the
React node for nodes you care about and `null` for everything else.

## Signature

```ts
type RenderUserDefinedInputNode = (state: RenderUserDefinedInputNodeState, instance: ChatInstance) => ReactNode
```
