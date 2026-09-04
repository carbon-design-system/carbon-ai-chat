# RenderTokenChipArgs

- Kind: Interface
- Category: Utilities
- Reference: https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.RenderTokenChipArgs.html

Args for renderTokenChip. Carries the chip's stored attributes, the
trigger config whose `renderCustomToken` should draw it, and where the chip
is being rendered.

## Signature

```ts
interface RenderTokenChipArgs
```

## Members

### attrs

`attrs: TokenChipAttrs`

Node attrs in mention shape.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.RenderTokenChipArgs.html#attrs)

### config

`config?: Pick<TriggerSuggestionConfig, "renderCustomToken">`

Subset of the trigger-suggestion config relevant to chip rendering. Only
`renderCustomToken` is read; other config fields are ignored.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.RenderTokenChipArgs.html#config)

### context

`context: "historical" | "composer"`

Visual variant to render. `"composer"` is the live, being-typed token in
the prompt-line editor; `"historical"` is a token inside an already-sent
message in the transcript. Drives the default chip's color/highlight —
see `ensureTokenStyleRules`.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.RenderTokenChipArgs.html#context)

### dispatchTarget

`dispatchTarget?: EventTarget`

Where to dispatch the light-DOM portal event when `renderCustomToken`
returns custom content. The NodeView passes the editor's `view.dom`
(already mounted under the chat wrapper) so the event reaches the portal
listener synchronously. When omitted, the event fires from the portal
container element itself with `bubbles: true, composed: true` — callers
that mount the chip lazily must ensure it lives under a listener subtree
before connection.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.RenderTokenChipArgs.html#dispatchtarget)

### type

`type: string`

Token type — usually `"mention"` or `"command"`.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.1/docs/interfaces/Type_reference.RenderTokenChipArgs.html#type)

## Related

- [renderTokenChip](./renderTokenChip.md)
