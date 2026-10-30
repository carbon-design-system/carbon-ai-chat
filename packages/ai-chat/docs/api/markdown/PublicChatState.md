<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# PublicChatState

- Kind: Interface
- Category: Instance
- Reference: https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.PublicChatState.html

Immutable public state returned by `state.get()` on ChatInstance.state.

## Signature

```ts
interface PublicChatState
```

## Members

### activeResponseId

`activeResponseId: string`

The message id of the currently active response. The "active response" is the latest response that has been
received or is expected. For instance, if you send another message the current activeResponseId will be set to
null until you get a new response back. This is meant to be used to disable any user inputs in a user_defined
response that you don't want active if its not a message you should be receiving inputs from.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.PublicChatState.html#activeresponseid)

### customPanels

`customPanels: PublicCustomPanelsState`

State for any surfaced custom panels.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.PublicChatState.html#custompanels)

### disclaimersAccepted

`disclaimersAccepted: ObjectMap<boolean>`

Map of if a disclaimer has been accepted on a given window.hostname value, keyed by hostname via
ObjectMap.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.PublicChatState.html#disclaimersaccepted)

### hasSentNonWelcomeMessage

`hasSentNonWelcomeMessage: boolean`

If the user has received a message beyond the welcome node. We use this to mark if the chat has been interacted
with. This flag is duplicated so the information is available before hydration and before the user is known.
Note that this property reflects only the last user and should only be used when an approximate value is
acceptable.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.PublicChatState.html#hassentnonwelcomemessage)

### homeScreenState

`homeScreenState: HomeScreenState`

State of home screen.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.PublicChatState.html#homescreenstate)

### humanAgent

`humanAgent: PublicChatHumanAgentState`

Current human agent state.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.PublicChatState.html#humanagent)

### input

`input: PublicInputState`

**Experimental.**

State representing the main input surface.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.PublicChatState.html#input)

### isHydratingCounter

`isHydratingCounter: number`

**Deprecated.** Read `status` as a ConversationStatus and check for `loading` — removed in 2.0.0.

Counter that indicates if the chat is hydrating and a full screen loading state should be displayed.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.PublicChatState.html#ishydratingcounter)

### isMessageLoadingCounter

`isMessageLoadingCounter: number`

Counter that indicates if a message is loading and a loading indicator should be displayed.
If "0" then we do not show loading indicator.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.PublicChatState.html#ismessageloadingcounter)

### isMessageLoadingText

`isMessageLoadingText?: string`

Optional string to display next to the loading indicator.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.PublicChatState.html#ismessageloadingtext)

### launcherIsExpanded

`launcherIsExpanded: boolean`

Indicates if the launcher should be in the expanded state.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.PublicChatState.html#launcherisexpanded)

### launcherShouldStartCallToActionCounterIfEnabled

`launcherShouldStartCallToActionCounterIfEnabled: boolean`

Determines if the launcher should start a timer to show its expanded state.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.PublicChatState.html#launchershouldstartcalltoactioncounterifenabled)

### messages

`messages: readonly Readonly<Message>[]`

Conversation messages, oldest first, or `[]` when empty. Partial
streaming content is included as it arrives. The array and its message
values are immutable snapshots, and internal UI state is omitted.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.PublicChatState.html#messages)

### showUnreadIndicator

`showUnreadIndicator: boolean`

Indicates if we should show an unread indicator on the launcher. This is set by
ChatInstance.updateAssistantUnreadIndicatorVisibility and will display an empty circle on
the launcher. This setting is overridden if there are any unread human agent messages in which case a circle
with a number is displayed.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.PublicChatState.html#showunreadindicator)

### status

`status: ConversationStatus`

The current conversation phase. See ConversationStatus for each value and its precedence.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.PublicChatState.html#status)

### version

`version: string`

The version of the Carbon AI Chat that this data is persisted for. If there are any breaking changes to the
application state and a user reloads and gets a new version of the widget, bad things might happen so we'll
just invalidate the persisted storage if we ever attempt to load an old version on Carbon AI Chat startup.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.PublicChatState.html#version)

### viewState

`viewState: ViewState`

Indicates which of the Carbon AI Chat views are visible and which are hidden.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.PublicChatState.html#viewstate)

### wasLoadedFromBrowser

`wasLoadedFromBrowser: boolean`

Indicates if this state was loaded from browser session storage or if was created as part of a new session.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.PublicChatState.html#wasloadedfrombrowser)

### workspace

`workspace: PublicWorkspaceCustomPanelState`

State for the workspace panel.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.PublicChatState.html#workspace)

## Related

- [ChatInstance.state](./ChatInstance.md)
