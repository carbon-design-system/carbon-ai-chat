# HistoryConfig

- Kind: Interface
- Category: Config
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.HistoryConfig.html

Configuration for the history panel of the chat.

## Signature

```ts
interface HistoryConfig
```

## Members

### isOn

`isOn?: boolean`

Indicates if the history panel should be shown.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.HistoryConfig.html#ison)

### showMobileMenu

`showMobileMenu?: boolean`

Controls whether the mobile menu options (New chat, View chats) should be shown
in the header when the history panel is in mobile mode.

When true (default), the mobile menu will appear in the header on small screens,
providing quick access to start a new chat or view chat history.

When false, the mobile menu will be hidden even when in mobile mode.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.HistoryConfig.html#showmobilemenu)

### startClosed

`startClosed?: boolean`

Controls whether history starts closed and enables state preservation across mode changes.

When false (default):
- Desktop starts open, mobile starts closed
- Resizing between modes resets to default state

When true:
- Both desktop and mobile start closed
- User's open/closed state is preserved when resizing between modes
- Enables external control via: instance.customPanels.getPanel(PanelType.HISTORY).open()/close()

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.HistoryConfig.html#startclosed)
