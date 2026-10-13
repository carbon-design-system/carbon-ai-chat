<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# loadAllLazyDeps

- Kind: TypeAlias
- Category: Testing
- Reference: https://chat.carbondesignsystem.com/version/v1.23.0-rc.0/docs/types/Type_reference.loadAllLazyDeps.html

Preloads optional components and locales before rendering in tests.
When a DOM is present, also loads the chat UI and startup modules.
Only available from `@carbon/ai-chat/server`.

## Signature

```ts
type loadAllLazyDeps = () => Promise<void>
```
