# ToolbarAction

- Kind: TypeAlias
- Category: Config
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0-rc.1/docs/types/Type_reference.ToolbarAction.html

A single custom action button, used by both the chat header toolbar
(HeaderConfig.actions) and the chat input actions row
(InputConfig.actions). Carries the icon, accessible `text` (also the
tooltip), an `onClick` handler or `href` link, and optional `disabled` /
`danger` / `divider` flags. Set `fixed: true` to keep the action visible
rather than collapsing into the overflow menu when space is tight.

## Signature

```ts
type ToolbarAction = _ToolbarAction
```

## Related

- [HeaderConfig.actions](./HeaderConfig.md)
- [InputConfig.actions](./InputConfig.md)
