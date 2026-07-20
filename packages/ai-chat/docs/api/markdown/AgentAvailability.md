# AgentAvailability

- Kind: Interface
- Category: Service desk
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.AgentAvailability.html

Information about the current availability of an agent while a user is waiting to be connected. If these are not set
the Carbon AI Chat will provide generic messaging letting the user know that a request for an agent has been sent.

Note that only one of these fields will be used by Carbon AI Chat if more than one has been assigned a value. Priority
first goes to estimatedWaitTime, then positionInQueue, and then message.

## Signature

```ts
interface AgentAvailability
```

## Members

### estimatedWaitTime

`estimatedWaitTime?: number`

The estimated wait time for the user in minutes. E.g. "Current wait time is 2 minutes."

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.AgentAvailability.html#estimatedwaittime)

### message

`message?: string`

A custom message to display to the user containing the updated status. This may contain markdown.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.AgentAvailability.html#message)

### positionInQueue

`positionInQueue?: number`

The current position of the user in a queue. E.g. "You are number 2 in line."

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.AgentAvailability.html#positioninqueue)
