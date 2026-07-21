# WorkspaceCustomPanelConfigOptions

- Kind: Interface
- Category: Instance
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.WorkspaceCustomPanelConfigOptions.html

Options supported by the workspace custom panel implementation.

## Signature

```ts
interface WorkspaceCustomPanelConfigOptions
```

## Members

### additionalData

`additionalData?: unknown`

Additional metadata associated with the workspace. This will be included in WORKSPACE_PRE_CLOSE and WORKSPACE_CLOSE events.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.WorkspaceCustomPanelConfigOptions.html#additionaldata)

### preferredLocation

`preferredLocation?: "start" | "end"`

Where the chat will attempt to render the workspace in logical terms. For a ltr layout "start" will render on the left and "end" will render on the right. If there is not enough room to render the workspace, it will be rendered as a panel overlaying the content with a back button.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.WorkspaceCustomPanelConfigOptions.html#preferredlocation)

### title

`title?: string`

The title of the workspace. Used for accessibility announcements.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.WorkspaceCustomPanelConfigOptions.html#title)

### workspaceId

`workspaceId?: string`

The ID of the workspace being opened. This will be included in WORKSPACE_PRE_CLOSE and WORKSPACE_CLOSE events.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.WorkspaceCustomPanelConfigOptions.html#workspaceid)
