# EventBusHandler

- Kind: TypeAlias
- Category: Instance
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/types/Type_reference.EventBusHandler.html

The type of handler for event bus events. This function may return a Promise in which case, the bus will await
the result and the loop will block until the Promise is resolved.

## Signature

```ts
type EventBusHandler = (event: T, instance: ChatInstance) => unknown
```
