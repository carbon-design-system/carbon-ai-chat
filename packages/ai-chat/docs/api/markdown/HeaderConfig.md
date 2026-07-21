# HeaderConfig

- Kind: Interface
- Category: Config
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.HeaderConfig.html

Configuration for the main header of the chat.

## Signature

```ts
interface HeaderConfig
```

## Members

### actions

`actions?: ToolbarAction[]`

Custom actions to display in the header toolbar. These actions can overflow
into a menu when space is limited.

The icon property accepts CarbonIcon objects (from @carbon/web-components) or
React icon components (from @carbon/icons-react).

Built-in buttons (restart, close) will be appended after these custom actions if
configured to be shown. You can, of course, disabled those OOTB icons and replace
them with your own.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.HeaderConfig.html#actions)

### hasContentMaxWidth

`hasContentMaxWidth?: boolean`

Controls whether the header should be constrained to the messages max width
(--cds-aichat-messages-max-width) or go full width. When true, the header
will be constrained to match the message width. When false (default), the
header will span the full width of the chat container.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.HeaderConfig.html#hascontentmaxwidth)

### hideDefaultAiLabelContent

`hideDefaultAiLabelContent?: boolean`

Controls whether the default AI label content should be hidden.
The default content is only meant to serve as a placeholder and should be
replaced with custom content using:
WriteableElementName.EXPLAINABILITY_POPOVER_CONTENT and
WriteableElementName.EXPLAINABILITY_POPOVER_ACTIONS.
When set to true, all the default ai label content including the deprecated
WriteableElementName.AI_TOOLTIP_AFTER_DESCRIPTION_ELEMENT
writeable element will be removed.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.HeaderConfig.html#hidedefaultailabelcontent)

### hideMinimizeButton

`hideMinimizeButton?: boolean`

Hide the ability to minimize the Carbon AI Chat.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.HeaderConfig.html#hideminimizebutton)

### isOn

`isOn?: boolean`

If the chat should supply its own header. Can be false if you have a fullscreen chat or one embedded into a page and
you want to only make use of the main application header. Defaults to true.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.HeaderConfig.html#ison)

### menuOptions

`menuOptions?: CustomMenuOption[]`

All the currently configured custom menu options.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.HeaderConfig.html#menuoptions)

### minimizeButtonIconType

`minimizeButtonIconType?: MinimizeButtonIconType`

Indicates the icon to use for the close button in the header.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.HeaderConfig.html#minimizebuttonicontype)

### name

`name?: string`

The name displayed after the title.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.HeaderConfig.html#name)

### showAiLabel

`showAiLabel?: boolean`

Controls whether to show the AI label/slug in the header. Defaults to true.

There is currently no version of this that does not include the AI theme
blue gradients.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.HeaderConfig.html#showailabel)

### showRestartButton

`showRestartButton?: boolean`

If true, shows the restart conversation button in the header of home screen and main chat.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.HeaderConfig.html#showrestartbutton)

### title

`title?: string`

The chat header title.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.HeaderConfig.html#title)
