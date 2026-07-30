# readCarbonChatSession

- Kind: Function
- Category: Utilities
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/functions/Type_reference.readCarbonChatSession.html

Reads and validates the Carbon AI Chat session from sessionStorage.
Returns null if no session exists, if the data is corrupt, or if the
session was written by a different version of the library (version mismatch).

Pass the same namespace value as PublicConfig.namespace (if any).

## Signature

```ts
readCarbonChatSession(namespace?: string): PersistedState
```

## Examples

```ts
const session = readCarbonChatSession();
const wasOpen = session?.viewState.mainWindow === true;
```

```ts
// With a namespace matching PublicConfig.namespace
const session = readCarbonChatSession("myapp");
const wasOpen = session?.viewState.mainWindow === true;
```

## Related

- [PublicConfig.namespace](./PublicConfig.md)
