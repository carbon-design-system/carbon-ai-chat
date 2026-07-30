# BusEventType

- Kind: Enum
- Category: Events
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html

## Signature

```ts
enum BusEventType
```

## Members

### CHAT_READY

`CHAT_READY = "chat:ready"`

When the chat has finished hydrating from history or welcome node request.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#chat_ready)

### CHUNK_USER_DEFINED_RESPONSE

`CHUNK_USER_DEFINED_RESPONSE = "chunk:userDefinedResponse"`

Fired when a new chunk in a user_defined response comes through.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#chunk_user_defined_response)

### CLOSE_PANEL_BUTTON_TOGGLED

`CLOSE_PANEL_BUTTON_TOGGLED = "closePanelButton:toggled"`

When a panel has been closed.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#close_panel_button_toggled)

### CUSTOM_FOOTER_SLOT

`CUSTOM_FOOTER_SLOT = "customFooterSlot"`

Fired when a message with custom_footer_slot.is_on is received.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#custom_footer_slot)

### CUSTOM_PANEL_CLOSE

`CUSTOM_PANEL_CLOSE = "customPanel:close"`

Fired after a custom panel closes.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#custom_panel_close)

### CUSTOM_PANEL_OPEN

`CUSTOM_PANEL_OPEN = "customPanel:open"`

Fired after a custom panel opens.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#custom_panel_open)

### CUSTOM_PANEL_PRE_CLOSE

`CUSTOM_PANEL_PRE_CLOSE = "customPanel:pre:close"`

Fired before a custom panel closes.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#custom_panel_pre_close)

### CUSTOM_PANEL_PRE_OPEN

`CUSTOM_PANEL_PRE_OPEN = "customPanel:pre:open"`

Fired before a custom panel opens.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#custom_panel_pre_open)

### DISCLAIMER_ACCEPTED

`DISCLAIMER_ACCEPTED = "disclaimerAccepted"`

Fired if the disclaimer is accepted.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#disclaimer_accepted)

### FEEDBACK

`FEEDBACK = "feedback"`

This event is fired when the user interacts with the feedback controls on a message. This includes both the feedback
buttons (thumbs up/down) as well as the details popup where the user can submit additional information.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#feedback)

### HEADER_MENU_CLICK

`HEADER_MENU_CLICK = "header:menuClick"`

Fired when a user clicks on navigation items in the chat header (homescreen button or overflow menu).

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#header_menu_click)

### HISTORY_BEGIN

`HISTORY_BEGIN = "history:begin"`

Fired when history begins to load.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#history_begin)

### HISTORY_END

`HISTORY_END = "history:end"`

Fired after history is loaded.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#history_end)

### HISTORY_PANEL_NEW_CHAT

`HISTORY_PANEL_NEW_CHAT = "history:newChat"`

Fired when new chat option within the chat header menu is selected.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#history_panel_new_chat)

### HISTORY_PANEL_PRE_OPEN

`HISTORY_PANEL_PRE_OPEN = "historyPanel:pre:open"`

Fired before mobile chat history panel opens.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#history_panel_pre_open)

### HUMAN_AGENT_ARE_ANY_AGENTS_ONLINE

`HUMAN_AGENT_ARE_ANY_AGENTS_ONLINE = "human_agent:areAnyAgentsOnline"`

This event is fired after Carbon AI Chat calls "areAnyAgentsOnline" for a service desk. It will report the value returned
from that call. This is particularly useful if some custom code wants to take action if no agents are online.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#human_agent_are_any_agents_online)

### HUMAN_AGENT_END_CHAT

`HUMAN_AGENT_END_CHAT = "human_agent:endChat"`

This event is fired after a chat with an agent has ended. This is fired after BusEventType.HUMAN_AGENT_PRE_END_CHAT but
can be fired both from the user leaving the chat or the agent ending the chat.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#human_agent_end_chat)

### HUMAN_AGENT_PRE_END_CHAT

`HUMAN_AGENT_PRE_END_CHAT = "human_agent:pre:endChat"`

This event is fired before a chat with an agent is ended. This occurs after the user has selected "Yes" from the
confirmation modal but it can also be fired if the chat is ended by the agent. Note that this is not fired if a
request for an agent is cancelled. The human_agent:endChat event however is fired in that case.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#human_agent_pre_end_chat)

### HUMAN_AGENT_PRE_RECEIVE

`HUMAN_AGENT_PRE_RECEIVE = "human_agent:pre:receive"`

This event is fired before Carbon AI Chat processes a message received from a human agent from a service desk.
You can use this to filter messages before they are displayed to the end user.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#human_agent_pre_receive)

### HUMAN_AGENT_PRE_SEND

`HUMAN_AGENT_PRE_SEND = "human_agent:pre:send"`

This event is fired before Carbon AI Chat sends a message to a human agent from a service desk.
You can use this to filter messages before they are sent to the agent.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#human_agent_pre_send)

### HUMAN_AGENT_PRE_START_CHAT

`HUMAN_AGENT_PRE_START_CHAT = "human_agent:pre:startChat"`

This event is fired before a chat with a service desk has started. This occurs as soon as the user clicks the
"Request agent" button and before any attempt is made to communicate with the service desk.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#human_agent_pre_start_chat)

### HUMAN_AGENT_RECEIVE

`HUMAN_AGENT_RECEIVE = "human_agent:receive"`

This event is fired after Carbon AI Chat processes a message received from a human agent from a service desk.
You can use this to update your history store.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#human_agent_receive)

### HUMAN_AGENT_SEND

`HUMAN_AGENT_SEND = "human_agent:send"`

This event is fired after Carbon AI Chat sends a message to a human agent from a service desk.
You can use this to update your history store.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#human_agent_send)

### MESSAGE_ITEM_CUSTOM

`MESSAGE_ITEM_CUSTOM = "messageItemCustom"`

Fired when a button response item with button_type "custom_event" is clicked.
Provides the originating button item and the full message payload to handlers.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#message_item_custom)

### PRE_RECEIVE

`PRE_RECEIVE = "pre:receive"`

Fired before a message is received. Can take mutations to the message.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#pre_receive)

### PRE_RESTART_CONVERSATION

`PRE_RESTART_CONVERSATION = "pre:restartConversation"`

Fired before a conversation restarts.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#pre_restart_conversation)

### PRE_SEND

`PRE_SEND = "pre:send"`

Fired before a message is sent to customSendMessage. Can take mutations to the message.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#pre_send)

### RECEIVE

`RECEIVE = "receive"`

Fired after a message is received.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#receive)

### RESTART_CONVERSATION

`RESTART_CONVERSATION = "restartConversation"`

Fired after a conversation restarts.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#restart_conversation)

### SEND

`SEND = "send"`

Fired after the message is sent to customSendMessage.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#send)

### STATE_CHANGE

`STATE_CHANGE = "state:change"`

This event is fired whenever the public state returned by ChatInstance.getState() changes.
This includes changes to viewState, showUnreadIndicator, and other persisted state.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#state_change)

### STOP_STREAMING

`STOP_STREAMING = "stopStreaming"`

This event is fired when the "stop streaming" button in the input field is clicked.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#stop_streaming)

### USER_DEFINED_RESPONSE

`USER_DEFINED_RESPONSE = "userDefinedResponse"`

Fired when a userDefined message is received.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#user_defined_response)

### VIEW_CHANGE

`VIEW_CHANGE = "view:change"`

Fired after the view changes (e.g. when the chat window closes).

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#view_change)

### VIEW_PRE_CHANGE

`VIEW_PRE_CHANGE = "view:pre:change"`

Fired before the view changes (e.g. when the chat window closes).

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#view_pre_change)

### WORKSPACE_CLOSE

`WORKSPACE_CLOSE = "workspace:close"`

Fired after a workspace closes.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#workspace_close)

### WORKSPACE_OPEN

`WORKSPACE_OPEN = "workspace:open"`

Fired after a workspace opens.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#workspace_open)

### WORKSPACE_PRE_CLOSE

`WORKSPACE_PRE_CLOSE = "workspace:pre:close"`

Fired before a workspace closes.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#workspace_pre_close)

### WORKSPACE_PRE_OPEN

`WORKSPACE_PRE_OPEN = "workspace:pre:open"`

Fired before a workspace opens.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.BusEventType.html#workspace_pre_open)
