# RenderUserDefinedInputNode

**Experimental.**

- Kind: TypeAlias
- Category: React
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/types/Type_reference.RenderUserDefinedInputNode.html

React-side renderer for custom TipTap node types in user message bubbles.
Returned content mounts into LIGHT DOM so consumer stylesheets apply. The
library manages the slot lifecycle — register a renderer that returns the
React node for nodes you care about and `null` for everything else.

## Signature

```ts
type RenderUserDefinedInputNode = (state: RenderUserDefinedInputNodeState, instance: ChatInstance) => ReactNode
```
