# PanelType

- Kind: Enum
- Category: Instance
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.PanelType.html

Describes the different panel types that Carbon AI Chat supports.

## Signature

```ts
enum PanelType
```

## Members

### DEFAULT

`DEFAULT = "default"`

Opens the panel so that it overlays the main chat content.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.PanelType.html#default)

### HISTORY

`HISTORY = "history"`

Opens the history panel.

The history panel only appears in the chat panel when
config.history.isMobile is true.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.PanelType.html#history)

### WORKSPACE

`WORKSPACE = "workspace"`

Opens the panel in the Workspace layout.

On large screens, the panel is placed at the `preferredLocation` (`start` or `end`)
and pushes the chat content.

On small screens, the panel behaves like `DEFAULT`.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.PanelType.html#workspace)
