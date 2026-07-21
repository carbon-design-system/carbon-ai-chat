# BusEventHumanAgentPreStartChat

- Kind: Interface
- Category: Service desk
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventHumanAgentPreStartChat.html

This event is fired before the user is connected to a service desk. This occurs as soon as the user clicks the
"Request agent" button and before any attempt is made to communicate with the service desk.

## Signature

```ts
interface BusEventHumanAgentPreStartChat
```

## Members

### cancelStartChat

`cancelStartChat?: boolean`

This flag can be set by a listener to indicate that the connection process should be cancelled.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventHumanAgentPreStartChat.html#cancelstartchat)

### message

`message: MessageResponse`

The message that was used to trigger the connection to the agent.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventHumanAgentPreStartChat.html#message)

### preStartChatPayload

`preStartChatPayload?: TPayloadType`

Some arbitrary payload of data that will be passed to the service desk when a chat is started.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventHumanAgentPreStartChat.html#prestartchatpayload)

### type

`type: HUMAN_AGENT_PRE_START_CHAT`

The type of the event.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventHumanAgentPreStartChat.html#type)
