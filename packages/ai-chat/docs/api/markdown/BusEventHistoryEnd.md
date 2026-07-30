# BusEventHistoryEnd

- Kind: Interface
- Category: Events
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventHistoryEnd.html

The event is fired whenever the widget begins processing a list of messages that have been loaded from history.
This event may be fired not only when the history is first loaded but it may be fired later during the life of
the widget if additional messages are loaded from history.

This event is fired when this process ends. This is fired after all the "pre:receive" and "receive" events are
fired which means that the messages here are the potentially modified messages after any possible modifications
by the event handlers.

## Signature

```ts
interface BusEventHistoryEnd
```

## Members

### messages

`messages: Message[]`

The list of all the messages that were loaded by this history event.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventHistoryEnd.html#messages)

### type

`type: HISTORY_END`

The discriminating type of this event.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventHistoryEnd.html#type)
