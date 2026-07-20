# loadAllLazyDeps

- Kind: TypeAlias
- Category: Testing
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/types/Type_reference.loadAllLazyDeps.html

Eagerly loads every lazily imported dependency across both
`@carbon/ai-chat-components` and `@carbon/ai-chat` so tests can preload
everything they need (Jest, Vitest, server rendering, etc.). Only available
from `@carbon/ai-chat/server`.

## Signature

```ts
type loadAllLazyDeps = () => Promise<void>
```
