# DefaultCustomPanelConfigOptions

- Kind: Interface
- Category: Instance
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.DefaultCustomPanelConfigOptions.html

Options supported by the default custom panel implementation.

When hideBackButton is set to true, any title value defined here will override the title/name in
the main chat header.

## Signature

```ts
interface DefaultCustomPanelConfigOptions
```

## Members

### aiEnabled

`aiEnabled?: boolean`

Shows the AI gradient background on your panel. Can be used with in concert with showFrame.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.DefaultCustomPanelConfigOptions.html#aienabled)

### backButtonPosition

`backButtonPosition?: "start" | "end"`

Controls the position of the back button in the panel header.
Use "start" to position it at the beginning in the navigation slot,
or "end" to position it at the end in the toolbar actions.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.DefaultCustomPanelConfigOptions.html#backbuttonposition)

### backButtonType

`backButtonType?: "minimize" | "close"`

Controls the icon used for the back button. Use "minimize" to indicate the
panel can be returned to, or "close" to indicate the panel will not return.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.DefaultCustomPanelConfigOptions.html#backbuttontype)

### disableAnimation

`disableAnimation?: boolean`

Determines if the panel open/close animation should be turned off. By default, the panel will animate up from the
bottom of the chat window.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.DefaultCustomPanelConfigOptions.html#disableanimation)

### fullWidth

`fullWidth?: boolean`

By default, the panel will render at the width of the messages list. If you want to be able to render to a full screen
width slot, set fullWidth to true.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.DefaultCustomPanelConfigOptions.html#fullwidth)

### hideBackButton

`hideBackButton?: boolean`

Indicates if the back button in the custom panel should be hidden.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.DefaultCustomPanelConfigOptions.html#hidebackbutton)

### openFromSide

`openFromSide?: boolean`

When true, the panel will slide in/out from the side instead of from the bottom.
By default, panels animate from the bottom.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.DefaultCustomPanelConfigOptions.html#openfromside)

### showChatHeader

`showChatHeader?: boolean`

Make the main chat header visible while the panel is open.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.DefaultCustomPanelConfigOptions.html#showchatheader)

### showFrame

`showFrame?: boolean`

Show a frame with the chat shell background instead of the gradient background for your panel content.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.DefaultCustomPanelConfigOptions.html#showframe)

### title

`title?: string`

The panel title displayed in the custom panel header. When a back button is visible the inherited header remains
on screen above the panel so this title acts like a breadcrumb; when the back button is hidden, the header fills
the panel chrome and this title becomes the primary heading within the overlay.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.DefaultCustomPanelConfigOptions.html#title)

## Related

- [DefaultCustomPanelConfigOptions.hideBackButton](./DefaultCustomPanelConfigOptions.md)
- [DefaultCustomPanelConfigOptions.title](./DefaultCustomPanelConfigOptions.md)
