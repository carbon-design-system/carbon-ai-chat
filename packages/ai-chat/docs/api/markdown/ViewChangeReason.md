# ViewChangeReason

- Kind: Enum
- Category: Events
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.ViewChangeReason.html

The possible reasons why the view may be changed.

## Signature

```ts
enum ViewChangeReason
```

## Members

### CALLED_CHANGE_VIEW

`CALLED_CHANGE_VIEW = "calledChangeView"`

Indicates the view was changed by a call to ChatInstance.changeView.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.ViewChangeReason.html#called_change_view)

### LAUNCHER_CLICKED

`LAUNCHER_CLICKED = "launcherClicked"`

Indicates the user clicked on our built-in launcher button that opened the main window.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.ViewChangeReason.html#launcher_clicked)

### MAIN_WINDOW_MINIMIZED

`MAIN_WINDOW_MINIMIZED = "mainWindowMinimized"`

Indicates the user clicked on our built-in minimize button that closed the launcher.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.ViewChangeReason.html#main_window_minimized)

### WEB_CHAT_LOADED

`WEB_CHAT_LOADED = "webChatLoaded"`

Indicates the Carbon AI Chat has loaded for the first time and a view is trying to open. If openChatByDefault is
true then the main window will be trying to open, otherwise the launcher will be trying to open.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.ViewChangeReason.html#web_chat_loaded)
