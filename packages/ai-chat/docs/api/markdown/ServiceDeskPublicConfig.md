# ServiceDeskPublicConfig

- Kind: Interface
- Category: Service desk
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ServiceDeskPublicConfig.html

The section of the public config that contains configuration options for service desk integrations.

## Signature

```ts
interface ServiceDeskPublicConfig
```

## Members

### agentJoinTimeoutSeconds

`agentJoinTimeoutSeconds?: number`

The timeout value is seconds to use when waiting for an agent to join the chat after an agent has been
requested. If no agent joins after this time, the chat will be ended and an error message will be displayed to
the user. By default, there is no timeout.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ServiceDeskPublicConfig.html#agentjointimeoutseconds)

### allowReconnect

`allowReconnect?: boolean`

Indicates if Carbon AI Chat should automatically attempt to reconnect the user to a human agent when it is loaded. This
only works if the service desk integration being used supports reconnecting. This value defaults to true.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ServiceDeskPublicConfig.html#allowreconnect)

### availabilityTimeoutSeconds

`availabilityTimeoutSeconds?: number`

The timeout value in seconds to use when determining agent availability. When a connect_to_agent response is
received, the system will ask the service desk if any agents are available. If no response is received within
the timeout window, the system will return "false" to indicate no agents are available.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ServiceDeskPublicConfig.html#availabilitytimeoutseconds)

### skipConnectHumanAgentCard

`skipConnectHumanAgentCard?: boolean`

Indicates if Carbon AI Chat should auto-connect to an agent whenever it receives a connect_to_agent response and
agents are available. This essentially mimics the user clicking the "Request agent" button on the card. The
card is still displayed to the user.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ServiceDeskPublicConfig.html#skipconnecthumanagentcard)
