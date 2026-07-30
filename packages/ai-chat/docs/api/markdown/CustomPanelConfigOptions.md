# CustomPanelConfigOptions

**Deprecated.** Use DefaultCustomPanelConfigOptions for default panels.

- Kind: Interface
- Category: Instance
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CustomPanelConfigOptions.html

Options that change how the custom panel looks. When a header is shown, it inherits styling and behavior from the
configured HeaderConfig (title, assistant name, AI slug, minimize button style, overflow menu, etc.) unless
explicitly overridden below.

## Signature

```ts
interface CustomPanelConfigOptions
```

## Members

### disableAnimation

`disableAnimation?: boolean`

**Deprecated.**

Determines if the panel open/close animation should be turned off.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CustomPanelConfigOptions.html#disableanimation)

### disableDefaultCloseAction

`disableDefaultCloseAction?: boolean`

**Deprecated.** Use DefaultCustomPanelConfigOptions for default panels.

Disables the default action that is taken when the close button is clicked. Normally clicking the close/minimize
button will run Carbon AI Chat's standard close routine (after verifying no view change is in progress). Set this
to true when you want to keep the experience open or handle closing asynchronously; you'll need to perform the
desired close work inside onClickClose.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CustomPanelConfigOptions.html#disabledefaultcloseaction)

### hideBackButton

`hideBackButton?: boolean`

**Deprecated.**

Indicates if the back button in the custom panel should be hidden. When hidePanelHeader is true, the back
button is hidden automatically. When the back button is visible the panel opens beneath the chat header so users
can always access the assistant-level header controls while the panel is active.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CustomPanelConfigOptions.html#hidebackbutton)

### hideCloseButton

`hideCloseButton?: boolean`

**Deprecated.** Use DefaultCustomPanelConfigOptions for default panels.

Indicates if the close/minimize button in the custom panel should be hidden.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CustomPanelConfigOptions.html#hideclosebutton)

### hidePanelHeader

`hidePanelHeader?: boolean`

**Deprecated.** Use DefaultCustomPanelConfigOptions for default panels.

Indicates if the panel header should be hidden. Hiding the header removes the inherited title, AI slug, minimize
button, and back button chrome entirely. Leave this undefined to animate the panel in with the standard header; set
it to true when you need a chrome-free experience (for example, when the panel content provides its own close
controls or you want the panel to cover the chat header without animating the header into view).

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CustomPanelConfigOptions.html#hidepanelheader)

### onClickBack

`onClickBack?: () => void`

**Deprecated.** Use DefaultCustomPanelConfigOptions for default panels.

Called after the header's back button is clicked. The panel automatically closes before this callback is invoked,
so you can safely run follow-up logic or analytics once the panel has been dismissed.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CustomPanelConfigOptions.html#onclickback)

### onClickClose

`onClickClose?: () => void`

**Deprecated.** Use DefaultCustomPanelConfigOptions for default panels.

Called when the header's close/minimize button is clicked. By default Carbon AI Chat will run its normal close
behavior (which collapses the experience) before this callback fires; set disableDefaultCloseAction to true
if you plan to intercept the event and manage closing yourself. The callback still fires even when the default
action is disabled.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CustomPanelConfigOptions.html#onclickclose)

### onClickRestart

`onClickRestart?: () => void`

**Deprecated.** Use DefaultCustomPanelConfigOptions for default panels.

Called when the restart button in the header is clicked. Use this to trigger a conversation reset or your own
telemetry when the restart control is surfaced.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CustomPanelConfigOptions.html#onclickrestart)

### title

`title?: string`

**Deprecated.**

The panel title displayed in the custom panel header. Left blank by default which causes the configured chat header
title/name to be shown instead. When a back button is visible the inherited header stays on screen above the panel
so this title acts like a breadcrumb; when the back button is hidden, the header fills the panel chrome and this
title becomes the primary heading within the overlay.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CustomPanelConfigOptions.html#title)

## Related

- [HeaderConfig](./HeaderConfig.md)
