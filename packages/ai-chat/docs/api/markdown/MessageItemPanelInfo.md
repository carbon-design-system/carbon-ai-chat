# MessageItemPanelInfo

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageItemPanelInfo.html

## Signature

```ts
interface MessageItemPanelInfo
```

## Members

### ai_enabled

`ai_enabled?: boolean`

Shows the AI gradient background on your panel. Can be used with in concert with showFrame.

Defaults to PublicConfig.aiEnabled value.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageItemPanelInfo.html#ai_enabled)

### body

`body?: GenericItem<Record<string, unknown>>[]`

A list of message items to render in a Carbon AI Chat panel.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageItemPanelInfo.html#body)

### footer

`footer?: ButtonItem<Record<string, unknown>>[]`

A list of button items that are rendered under the panel body.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageItemPanelInfo.html#footer)

### full_width

`full_width?: boolean`

By default, the panel will render at the width of the messages list. If you want to be able to render to a full screen
width slot, set full_width to true.

Defaults to false.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageItemPanelInfo.html#full_width)

### show_animations

`show_animations?: boolean`

Determines if the panel close and open animations should be enabled or not.

Defaults to true.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageItemPanelInfo.html#show_animations)

### show_frame

`show_frame?: boolean`

Show a frame with the chat shell background instead of the gradient background for your panel content.

Defaults to true.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageItemPanelInfo.html#show_frame)

### show_header

`show_header?: boolean`

Determines if the panel header should not be visible or not.

Defaults to true.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageItemPanelInfo.html#show_header)

### title

`title?: string`

The title to give the panel in Carbon AI Chat.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageItemPanelInfo.html#title)
