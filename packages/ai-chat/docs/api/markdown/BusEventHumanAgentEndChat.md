# BusEventHumanAgentEndChat

- Kind: Interface
- Category: Service desk
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventHumanAgentEndChat.html

This event is fired after a chat with an agent has ended. This is fired after BusEventType.HUMAN_AGENT_PRE_END_CHAT but
can be fired both from the user leaving the chat or the agent ending the chat.

## Signature

```ts
interface BusEventHumanAgentEndChat
```

## Members

### endedByHumanAgent

`endedByHumanAgent: boolean`

Indicates if the chat was ended by the agent.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventHumanAgentEndChat.html#endedbyhumanagent)

### requestCancelled

`requestCancelled: boolean`

Indicates if the chat was ended because the request for an agent was cancelled or an error occurred while
starting the chat. This means the start never fully started.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventHumanAgentEndChat.html#requestcancelled)

### type

`type: HUMAN_AGENT_END_CHAT`

The type of the event.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventHumanAgentEndChat.html#type)

## Related

- [BusEventType.HUMAN_AGENT_PRE_END_CHAT](./BusEventType.md)
