# PersistedState

- Kind: Interface
- Category: Instance
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PersistedState.html

Items stored in sessionStorage.

## Signature

```ts
interface PersistedState
```

## Members

### disclaimersAccepted

`disclaimersAccepted: ObjectMap<boolean>`

Map of if a disclaimer has been accepted on a given window.hostname value, keyed by hostname via
ObjectMap.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PersistedState.html#disclaimersaccepted)

### hasSentNonWelcomeMessage

`hasSentNonWelcomeMessage: boolean`

If the user has received a message beyond the welcome node. We use this to mark if the chat has been interacted
with. This flag is duplicated so the information is available before hydration and before the user is known.
Note that this property reflects only the last user and should only be used when an approximate value is
acceptable.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PersistedState.html#hassentnonwelcomemessage)

### homeScreenState

`homeScreenState: HomeScreenState`

State of home screen.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PersistedState.html#homescreenstate)

### humanAgentState

`humanAgentState: PersistedHumanAgentState`

The persisted subset of the human agent state.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PersistedState.html#humanagentstate)

### launcherIsExpanded

`launcherIsExpanded: boolean`

Indicates if the launcher should be in the expanded state.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PersistedState.html#launcherisexpanded)

### launcherShouldStartCallToActionCounterIfEnabled

`launcherShouldStartCallToActionCounterIfEnabled: boolean`

Determines if the launcher should start a timer to show its expanded state.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PersistedState.html#launchershouldstartcalltoactioncounterifenabled)

### showUnreadIndicator

`showUnreadIndicator: boolean`

Indicates if we should show an unread indicator on the launcher. This is set by
ChatInstance.updateAssistantUnreadIndicatorVisibility and will display an empty circle on
the launcher. This setting is overridden if there are any unread human agent messages in which case a circle
with a number is displayed.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PersistedState.html#showunreadindicator)

### version

`version: string`

The version of the Carbon AI Chat that this data is persisted for. If there are any breaking changes to the
application state and a user reloads and gets a new version of the widget, bad things might happen so we'll
just invalidate the persisted storage if we ever attempt to load an old version on Carbon AI Chat startup.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PersistedState.html#version)

### viewState

`viewState: ViewState`

Indicates which of the Carbon AI Chat views are visible and which are hidden.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PersistedState.html#viewstate)

### wasLoadedFromBrowser

`wasLoadedFromBrowser: boolean`

Indicates if this state was loaded from browser session storage or if was created as part of a new session.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PersistedState.html#wasloadedfrombrowser)
