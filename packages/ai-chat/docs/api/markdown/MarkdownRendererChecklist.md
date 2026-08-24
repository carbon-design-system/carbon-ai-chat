# MarkdownRendererChecklist

**Experimental.**

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererChecklist.html

Behavior hook that makes task-list checkboxes actionable — `onToggle` plus
an optional `getChecked` source-of-truth. See MarkdownRendererChecklist.

## Signature

```ts
interface MarkdownRendererChecklist
```

## Members

### getChecked

`getChecked?: (args: MarkdownRendererChecklistItemArgs) => boolean`

**Experimental.**

Optional source-of-truth for the checked state, consulted on every render.
Return a boolean to override the markdown-parsed state (so a persisted
toggle survives streaming re-renders), or `undefined` to keep it.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererChecklist.html#getchecked)

### onToggle

`onToggle: (args: MarkdownRendererChecklistToggleArgs) => void`

**Experimental.**

Invoked when a task-list checkbox is toggled. Providing this callback is
what wires the checkboxes for interaction.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererChecklist.html#ontoggle)
