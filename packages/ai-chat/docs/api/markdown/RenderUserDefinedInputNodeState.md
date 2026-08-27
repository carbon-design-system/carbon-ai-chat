# RenderUserDefinedInputNodeState

**Experimental.**

- Kind: Interface
- Category: React
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.RenderUserDefinedInputNodeState.html

The state passed to a `renderUserDefinedInputNode` call. The chat surfaces
one call per non-text TipTap node inside a sent user message's
`display_content` — typically a consumer-registered custom node such as a
task card, file pill, or mention with rich rendering.

## Signature

```ts
interface RenderUserDefinedInputNodeState
```

## Members

### message

`message: MessageRequest`

**Experimental.**

The full user message this node belongs to.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.RenderUserDefinedInputNodeState.html#message)

### node

`node: JSONContent`

**Experimental.**

The TipTap JSONContent node being rendered (carries `type`, `attrs`, etc.).

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.RenderUserDefinedInputNodeState.html#node)
