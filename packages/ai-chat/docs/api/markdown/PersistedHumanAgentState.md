# PersistedHumanAgentState

- Kind: Interface
- Category: Instance
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PersistedHumanAgentState.html

The subset of HumanAgentState that is persisted to browser storage.

## Signature

```ts
interface PersistedHumanAgentState
```

## Members

### isConnected

`isConnected: boolean`

Indicates that the user is connected to a human agent.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PersistedHumanAgentState.html#isconnected)

### isSuspended

`isSuspended: boolean`

Indicates if the human agent conversation is currently suspended.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PersistedHumanAgentState.html#issuspended)

### responseUserProfile

`responseUserProfile?: ResponseUserProfile`

The profile of the last human agent to join the chat.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PersistedHumanAgentState.html#responseuserprofile)

### responseUserProfiles

`responseUserProfiles: Record<string, ResponseUserProfile>`

Cache of known agent profiles by ID.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PersistedHumanAgentState.html#responseuserprofiles)

### serviceDeskState

`serviceDeskState?: unknown`

Arbitrary state saved by the service desk.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PersistedHumanAgentState.html#servicedeskstate)
