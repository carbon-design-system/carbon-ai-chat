# PersistedStateConfig

**Experimental.**

- Kind: Interface
- Category: Config
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PersistedStateConfig.html

Hands session-state persistence to the host page, set on PublicConfig.persistedState. By
default Carbon AI Chat stores session state in the browser's `sessionStorage`; providing either
field replaces that built-in storage — the chat no longer reads or writes `sessionStorage` and
instead boots from PersistedStateConfig.initialState and reports every change to
PersistedStateConfig.onStateChange. When neither field is set, the default `sessionStorage`
behavior is unchanged.

Round-trip the whole PersistableState value. Dropping fields such as `disclaimersAccepted`,
`humanAgentState`, or `hasSentNonWelcomeMessage` regresses the experience on reload: the disclaimer
re-prompts, an in-progress human-agent chat cannot reconnect, and the welcome message is re-sent.

## Signature

```ts
interface PersistedStateConfig
```

## Members

### initialState

`initialState?: PersistableState`

**Experimental.**

The session state to boot from, used in place of reading `sessionStorage`. Resolve any
asynchronous load (for example from your own backend) before constructing the chat and pass the
resolved value here. When omitted, the chat starts a fresh session but still reports changes to
PersistedStateConfig.onStateChange.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PersistedStateConfig.html#initialstate)

### onStateChange

`onStateChange?: (state: PersistableState) => void`

**Experimental.**

Called whenever the persistable session state changes, so the host can store it wherever it likes
(its own backend, `localStorage`, and so on). Replaces the internal `sessionStorage` write. The
argument is the complete PersistableState; persist it verbatim so it can later seed
PersistedStateConfig.initialState.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PersistedStateConfig.html#onstatechange)

## Related

- [PersistableState](./PersistableState.md)
- [PersistedStateConfig.initialState](./PersistedStateConfig.md)
- [PersistedStateConfig.onStateChange](./PersistedStateConfig.md)
- [PublicConfig.persistedState](./PublicConfig.md)
