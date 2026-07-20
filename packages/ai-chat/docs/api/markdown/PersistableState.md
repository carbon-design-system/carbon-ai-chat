# PersistableState

**Experimental.**

- Kind: TypeAlias
- Category: Config
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/types/Type_reference.PersistableState.html

The subset of session state that Carbon AI Chat can persist and restore, consumed by
PersistedStateConfig. It is the full internal PersistedState minus the
framework-internal bookkeeping (`version` and `wasLoadedFromBrowser`), so a value produced by
PersistedStateConfig.onStateChange can be handed straight back to
PersistedStateConfig.initialState to restore a session.

## Signature

```ts
type PersistableState = Omit<PersistedState, "version" | "wasLoadedFromBrowser">
```

## Related

- [PersistedState](./PersistedState.md)
- [PersistedStateConfig](./PersistedStateConfig.md)
- [PersistedStateConfig.initialState](./PersistedStateConfig.md)
- [PersistedStateConfig.onStateChange](./PersistedStateConfig.md)
