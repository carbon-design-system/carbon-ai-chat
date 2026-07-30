# BusEventHistoryBegin

- Kind: Interface
- Category: Events
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventHistoryBegin.html

The event is fired whenever the widget begins processing a list of messages that have been loaded from history.
This event may be fired not only when the history is first loaded but it may be fired later during the life of
the widget if additional messages are loaded from history.

This event is fired when this process begins. This is fired before all the "pre:receive" and "receive" events are
fired which means that the messages here are the original messages before any possible modifications by the event
handlers.

## Signature

```ts
interface BusEventHistoryBegin
```

## Members

### messages

`messages: Message[]`

The list of all the messages that are being loaded by this history event.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventHistoryBegin.html#messages)

### type

`type: HISTORY_BEGIN`

The discriminating type of this event.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventHistoryBegin.html#type)

### updateMessageIDs

`updateMessageIDs?: string[]`

Indicates that modifications were made to the given messages and that updates to those messages should be saved in
the history store. This is similar to the update behavior of the "pre:receive" event that is handled
automatically.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventHistoryBegin.html#updatemessageids)
