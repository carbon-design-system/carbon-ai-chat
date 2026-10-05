<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# EventBusHandler

- Kind: TypeAlias
- Category: Instance
- Reference: https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/types/Type_reference.EventBusHandler.html

The type of handler for event bus events. This function may return a Promise in which case, the bus will await
the result and the loop will block until the Promise is resolved.

## Signature

```ts
type EventBusHandler = (event: T, instance: ChatInstance) => unknown
```
