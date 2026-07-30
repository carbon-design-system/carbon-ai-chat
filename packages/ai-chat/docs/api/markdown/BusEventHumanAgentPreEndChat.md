# BusEventHumanAgentPreEndChat

- Kind: Interface
- Category: Service desk
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventHumanAgentPreEndChat.html

This event is fired before a chat with an agent is ended. This occurs after the user has selected "Yes" from the
confirmation modal but it can also be fired if the chat is ended by the agent.

## Signature

```ts
interface BusEventHumanAgentPreEndChat
```

## Members

### cancelEndChat

`cancelEndChat: boolean`

This value may be set by a listener to indicate that the process of ending the chat should be cancelled.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventHumanAgentPreEndChat.html#cancelendchat)

### endedByHumanAgent

`endedByHumanAgent: boolean`

Indicates if the chat was ended by the agent.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventHumanAgentPreEndChat.html#endedbyhumanagent)

### preEndChatPayload

`preEndChatPayload: TPayloadType`

An arbitrary payload object that a listener may set. This payload will be passed to the service desk
ServiceDesk endChat function.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventHumanAgentPreEndChat.html#preendchatpayload)

### type

`type: HUMAN_AGENT_PRE_END_CHAT`

The type of the event.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventHumanAgentPreEndChat.html#type)
