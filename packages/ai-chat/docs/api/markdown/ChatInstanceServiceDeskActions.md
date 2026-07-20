# ChatInstanceServiceDeskActions

- Kind: Interface
- Category: Instance
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatInstanceServiceDeskActions.html

Start or end conversations with human agent.

## Signature

```ts
interface ChatInstanceServiceDeskActions
```

## Members

### endConversation

`endConversation: () => Promise<void>`

Ends the conversation with a human agent. This does not request confirmation from the user first. If the user
is not connected or connecting to a human agent, this function has no effect. You can determine if the user is
connected or connecting by calling ChatInstance.getState. Note that this function
returns a Promise that only resolves when the conversation has ended. This includes after the
BusEventType.HUMAN_AGENT_PRE_END_CHAT and BusEventType.HUMAN_AGENT_END_CHAT events have been fired and
resolved.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatInstanceServiceDeskActions.html#endconversation)

### updateIsSuspended

`updateIsSuspended: (isSuspended: boolean) => Promise<void>`

Sets the suspended state for an agent conversation. A conversation can be suspended or un-suspended only if the
user is currently connecting or connected to an agent. If a conversation is suspended, then messages from the user
will no longer be routed to the service desk and incoming messages from the service desk will not be displayed. In
addition, the current connection status with an agent will not be shown.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatInstanceServiceDeskActions.html#updateissuspended)
