<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# ToolbarAction

- Kind: Interface
- Category: Config
- Reference: https://chat.carbondesignsystem.com/version/v1.22.0-rc.0/docs/interfaces/Type_reference.ToolbarAction.html

A single custom action button, used by both the chat header toolbar
(HeaderConfig.actions) and the chat input actions row
(InputConfig.actions). Carries the icon, accessible `text` (also the
tooltip), an `onClick` handler or `href` link, and optional `disabled` /
`danger` / `divider` flags. Set `fixed: true` to keep the action visible
rather than collapsing into the overflow menu when space is tight.

To render the action as a two-state toggle, set `isSelected`. When
`isSelected` is `true` or `false`, the button renders with `aria-pressed`
and a visible pressed treatment. Omitting `isSelected` entirely leaves the
action as a plain button with no toggle semantics — `undefined` is
intentionally distinct from `false`.

## Signature

```ts
interface ToolbarAction
```

## Members

### danger

`danger?: boolean`

`true` if the action is danger.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.0/docs/interfaces/Type_reference.ToolbarAction.html#danger)

### dangerDescription

`dangerDescription?: string`

Specify the message read by screen readers for the danger over flow menu item variant

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.0/docs/interfaces/Type_reference.ToolbarAction.html#dangerdescription)

### disabled

`disabled?: boolean`

`true` if the overflow menu item should be disabled.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.0/docs/interfaces/Type_reference.ToolbarAction.html#disabled)

### divider

`divider?: boolean`

`true` if the item has a divider

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.0/docs/interfaces/Type_reference.ToolbarAction.html#divider)

### fixed

`fixed?: boolean`

When overflow handling is enabled, setting fixed to true will force this action out of the overflow menu.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.0/docs/interfaces/Type_reference.ToolbarAction.html#fixed)

### href

`href?: string`

The link href of the overflow menu item.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.0/docs/interfaces/Type_reference.ToolbarAction.html#href)

### icon

`icon: ComponentType<any> | CarbonIcon`

Either an icon from `@carbon/icons` or from `@carbon/icons-react`.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.0/docs/interfaces/Type_reference.ToolbarAction.html#icon)

### id

`id?: string`

Optional ID

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.0/docs/interfaces/Type_reference.ToolbarAction.html#id)

### isSelected

`isSelected?: boolean`

Renders this action as a two-state toggle and sets its current state.
When `true` or `false`, the button exposes `aria-pressed` and a visible
pressed treatment. Omit the field for a plain button with no toggle
semantics — `undefined` is intentionally distinct from `false`.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.0/docs/interfaces/Type_reference.ToolbarAction.html#isselected)

### onClick

`onClick?: () => void`

Click handler for the menu item.
Optional to allow for link-only items (using href).

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.0/docs/interfaces/Type_reference.ToolbarAction.html#onclick)

### size

`size?: BUTTON_SIZE`

Size of button. Defaults to BUTTON_SIZE.MEDIUM.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.0/docs/interfaces/Type_reference.ToolbarAction.html#size)

### target

`target?: string`

Link target attribute (e.g., '_blank', '_self').
Used when href is provided.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.0/docs/interfaces/Type_reference.ToolbarAction.html#target)

### testId

`testId?: string`

Optional data-testid string for e2e testing.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.0/docs/interfaces/Type_reference.ToolbarAction.html#testid)

### text

`text: string`

Display text for the menu item.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.0/docs/interfaces/Type_reference.ToolbarAction.html#text)

## Related

- [HeaderConfig.actions](./HeaderConfig.md)
- [InputConfig.actions](./InputConfig.md)
