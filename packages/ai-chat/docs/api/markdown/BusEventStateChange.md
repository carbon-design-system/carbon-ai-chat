# BusEventStateChange

- Kind: Interface
- Category: Events
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventStateChange.html

This event is fired whenever the public state returned by ChatInstance.getState() changes.
This includes changes to viewState, showUnreadIndicator, and other persisted state.

## Signature

```ts
interface BusEventStateChange
```

## Members

### newState

`newState: PublicChatState`

The new state after the change.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventStateChange.html#newstate)

### previousState

`previousState: PublicChatState`

The previous state before the change.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventStateChange.html#previousstate)

### type

`type: STATE_CHANGE`

The type of the event.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventStateChange.html#type)
