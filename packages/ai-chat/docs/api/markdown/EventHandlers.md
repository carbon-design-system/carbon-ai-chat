# EventHandlers

- Kind: Interface
- Category: Instance
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.EventHandlers.html

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

## Examples

```ts
import { BusEventType } from "@carbon/ai-chat";

// off requires the same handler reference passed to on.
const onReceive = (event) => console.log(event.data);
instance.on({ type: BusEventType.RECEIVE, handler: onReceive });
instance.off({ type: BusEventType.RECEIVE, handler: onReceive });
```

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.EventHandlers.html#off)

### on

`on: (handlers: TypeAndHandler | TypeAndHandler[]) => EventHandlers`

Adds the given event handler as a listener for events of the given type.

## Examples

```ts
import { BusEventType } from "@carbon/ai-chat";

instance
  .on({ type: BusEventType.RECEIVE, handler: (event) => console.log(event.data) })
  .on({ type: BusEventType.VIEW_CHANGE, handler: (event) => console.log(event.newViewState) });
```

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.EventHandlers.html#on)

### once

`once: (handlers: TypeAndHandler | TypeAndHandler[]) => EventHandlers`

Adds the given event handler as a listener for events of the given type. After the first event is handled, this
handler will automatically be removed.

## Examples

```ts
import { BusEventType } from "@carbon/ai-chat";

instance.once({
  type: BusEventType.CHAT_READY,
  handler: () => console.log("chat is ready"),
});
```

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.EventHandlers.html#once)
