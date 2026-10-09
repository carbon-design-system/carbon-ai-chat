<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# loadAllLazyDeps

- Kind: TypeAlias
- Category: Testing
- Reference: https://chat.carbondesignsystem.com/version/v1.22.0/docs/types/Type_reference.loadAllLazyDeps.html

Eagerly loads every lazily imported dependency across both
`@carbon/ai-chat-components` and `@carbon/ai-chat` so tests can preload
everything they need (Jest, Vitest, server rendering, etc.). Only available
from `@carbon/ai-chat/server`.

## Signature

```ts
type loadAllLazyDeps = () => Promise<void>
```
