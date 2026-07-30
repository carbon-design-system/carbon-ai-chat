# BusEventHumanAgentAreAnyAgentsOnline

- Kind: Interface
- Category: Service desk
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventHumanAgentAreAnyAgentsOnline.html

This event is fired after Carbon AI Chat calls "areAnyAgentsOnline" for a service desk. It will report the value returned
from that call. This is particularly useful if some custom code wants to take action if no agents are online.

## Signature

```ts
interface BusEventHumanAgentAreAnyAgentsOnline
```

## Members

### areAnyAgentsOnline

`areAnyAgentsOnline: HumanAgentsOnlineStatus`

The result that was returned from "areAnyAgentsOnline". If an error occurred, this will be
HumanAgentsOnlineStatus.OFFLINE.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventHumanAgentAreAnyAgentsOnline.html#areanyagentsonline)

### type

`type: HUMAN_AGENT_ARE_ANY_AGENTS_ONLINE`

The type of the event.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventHumanAgentAreAnyAgentsOnline.html#type)
