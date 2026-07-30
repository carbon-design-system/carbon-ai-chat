# EventHandlers

- Kind: Interface
- Category: Instance
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.EventHandlers.html

This is a subset of the public interface that is managed by the event bus that is used for registering and
unregistering event listeners on the bus.

## Signature

```ts
interface EventHandlers
```

## Members

### off

`off: (handlers: TypeAndHandler | TypeAndHandler[]) => EventHandlers`

Removes an event listener that was previously added via on or once.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.EventHandlers.html#off)

### on

`on: (handlers: TypeAndHandler | TypeAndHandler[]) => EventHandlers`

Adds the given event handler as a listener for events of the given type.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.EventHandlers.html#on)

### once

`once: (handlers: TypeAndHandler | TypeAndHandler[]) => EventHandlers`

Adds the given event handler as a listener for events of the given type. After the first event is handled, this
handler will automatically be removed.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.EventHandlers.html#once)
