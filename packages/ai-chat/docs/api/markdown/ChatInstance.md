# ChatInstance

- Kind: Interface
- Category: Instance
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatInstance.html

The interface represents the API contract with the chat widget and contains all the public methods and properties
that can be used with Carbon AI Chat.

## Signature

```ts
interface ChatInstance
```

## Members

### changeView

`changeView: (newView: ViewState | ViewType) => Promise<void>`

Fire the view:pre:change and view:change events and change the view of the Carbon AI Chat. If a ViewType is
provided then that view will become visible and the rest will be hidden. If a ViewState is provided that
includes all of the views then all of the views will be changed accordingly. If a partial ViewState is
provided then only the views provided will be changed.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatInstance.html#changeview)

### customPanels

`customPanels?: CustomPanels`

Manager for accessing and controlling custom panels.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatInstance.html#custompanels)

### destroySession

`destroySession: (keepOpenState?: boolean) => Promise<void>`

Remove any record of the current session from the browser's SessionStorage.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatInstance.html#destroysession)

### doAutoScroll

`doAutoScroll: (options?: AutoScrollOptions) => void`

Re-pins the last qualifying message to the top of the viewport and recalculates the
scroll spacer.

Most of the time you do NOT need to call this for a `user_defined` response, even one
that renders asynchronously: the chat observes each message's size and reconciles the
spacer automatically when in-message content (including your `user_defined` component,
whether standalone or nested inside a reasoning step) changes height. Call this only when
you want the chat to actively re-pin/reveal your content, or as a safety net when a height
change cannot be observed — e.g. content rendered OUTSIDE the message subtree (a portal,
or a `fixed`/`absolute` overlay), content injected via WriteableElements, or a
message that grows while it is off-screen / not the last message and therefore has no
active pin.

With no options, the last qualifying message is re-pinned to the top and the spacer is
adjusted. To scroll to the very bottom of the message list instead, pass
`{ scrollToBottom: 0 }`. The spacer reconciliation pass still runs after explicit
top/bottom overrides so pin geometry remains accurate for subsequent updates.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatInstance.html#doautoscroll)

### getState

`getState: () => PublicChatState`

Returns state information of the Carbon AI Chat that could be useful.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatInstance.html#getstate)

### input

`input: ChatInstanceInput`

Actions for mutating the chat input contents.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatInstance.html#input)

### messaging

`messaging: ChatInstanceMessaging`

Messaging actions for a chat instance.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatInstance.html#messaging)

### off

`off: (handlers: TypeAndHandler | TypeAndHandler[]) => EventHandlers`

Removes an event listener that was previously added via on or once.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatInstance.html#off)

### on

`on: (handlers: TypeAndHandler | TypeAndHandler[]) => EventHandlers`

Adds the given event handler as a listener for events of the given type.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatInstance.html#on)

### once

`once: (handlers: TypeAndHandler | TypeAndHandler[]) => EventHandlers`

Adds the given event handler as a listener for events of the given type. After the first event is handled, this
handler will automatically be removed.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatInstance.html#once)

### requestFocus

`requestFocus: () => boolean | void`

This function can be called when another component wishes this component to gain focus. It is up to the
component to decide where focus belongs. This may return true or false to indicate if a suitable focus location
was found.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatInstance.html#requestfocus)

### restartConversation

`restartConversation: () => Promise<void>`

**Deprecated.** Use ChatInstanceMessaging.restartConversation instead.

Restarts the conversation with the assistant. This does not make any changes to a conversation with a human agent.
This will clear all the current assistant messages from the main assistant view and cancel any outstanding
messages. This will also clear the current assistant session which will force a new session to start on the
next message.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatInstance.html#restartconversation)

### scrollToMessage

`scrollToMessage: (messageID: string, animate?: boolean) => void`

Scrolls to the (original) message with the given ID. Since there may be multiple message items in a given
message, this will scroll the first message to the top of the message window.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatInstance.html#scrolltomessage)

### send

`send: (message: string | MessageRequest<MessageInput>, options?: SendOptions) => Promise<void>`

Sends the given message to the assistant on the remote server. This will result in a "pre:send" and "send" event
being fired on the event bus. The returned promise will resolve once a response has received and processed and
both the "pre:receive" and "receive" events have fired. It will reject when too many errors have occurred and
the system gives up retrying.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatInstance.html#send)

### serviceDesk

`serviceDesk: ChatInstanceServiceDeskActions`

Actions that are related to a service desk integration.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatInstance.html#servicedesk)

### updateAssistantUnreadIndicatorVisibility

`updateAssistantUnreadIndicatorVisibility: (isVisible: boolean) => void`

**Deprecated.** Configure via LauncherConfig.showUnreadIndicator.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatInstance.html#updateassistantunreadindicatorvisibility)

### updateCatastrophicErrorPanel

`updateCatastrophicErrorPanel: (panelState: CatastrophicErrorPanelState) => void`

Fires an event that will open or close the Catastrophic Error Panel in the chat. This also accepts a
custom title and body text (markdown supported) to be displayed in the Catastrophic Error Panel.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatInstance.html#updatecatastrophicerrorpanel)

### updateInputFieldVisibility

`updateInputFieldVisibility: (isVisible: boolean) => void`

**Deprecated.** Configure via InputConfig.isVisible.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatInstance.html#updateinputfieldvisibility)

### updateInputIsDisabled

`updateInputIsDisabled: (isDisabled: boolean) => void`

**Deprecated.** Configure via InputConfig.isDisabled
or PublicConfig.isReadonly.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatInstance.html#updateinputisdisabled)

### updateIsChatLoadingCounter

`updateIsChatLoadingCounter: (direction: IncreaseOrDecrease) => void`

Either increases or decreases the internal counter that indicates whether the hydration fullscreen loading state is
shown. If the count is greater than zero, then the indicator is shown. Values of "increase" or "decrease" will
increase or decrease the value. "reset" will set the value back to 0.

You can access the current value via ChatInstance.getState.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatInstance.html#updateischatloadingcounter)

### updateIsMessageLoadingCounter

`updateIsMessageLoadingCounter: (direction: IncreaseOrDecrease, message?: string) => void`

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatInstance.html#updateismessageloadingcounter)

### writeableElements

`writeableElements: Partial<WriteableElements>`

Returns the list of writable elements.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatInstance.html#writeableelements)
