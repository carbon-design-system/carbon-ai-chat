<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# EventBusHandler

- Kind: TypeAlias
- Category: Instance
- Reference: https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/types/Type_reference.EventBusHandler.html

The type of handler for event bus events. This function may return a Promise in which case, the bus will await
the result and the loop will block until the Promise is resolved.

An event fired while another event of the same type is still running waits until every handler for the earlier
one has settled, so events of one type reach your handlers in the order they were fired. A handler must therefore
not wait on a chat call that fires its own event type again, such as awaiting
ChatInstanceMessaging.addMessage inside a BusEventType.RECEIVE handler. After 10 seconds the chat
rejects that inner call and skips its handlers.

## Signature

```ts
type EventBusHandler = (event: T, instance: ChatInstance) => unknown
```

## Related

- [BusEventType.RECEIVE](./BusEventType.md)
- [ChatInstanceMessaging.addMessage](./ChatInstanceMessaging.md)
