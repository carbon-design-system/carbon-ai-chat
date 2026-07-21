# BusEventViewChange

- Kind: Interface
- Category: Events
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventViewChange.html

Fires after the view state has been updated in the store. This event is awaited, making it ideal for async operations that should happen after the view change.

**Event Timing:**
1. VIEW_PRE_CHANGE fires (awaited)
2. View state is updated in store
3. VIEW_CHANGE fires (awaited) ← You are here

**Use cases:**
- React to completed view changes
- Run cleanup or follow-up animations
- Cancel and revert the view change (causes immediate revert without firing events)

## Signature

```ts
interface BusEventViewChange
```

## Members

### cancelViewChange

`cancelViewChange: boolean`

This is used by the event handler to indicate that the view change should be cancelled and Carbon AI Chat's view should
not be changed. Since the view has already changed when this event is fired, this property will cause the view to
change back. Note that the view change events are *not* fired when the view changes back.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventViewChange.html#cancelviewchange)

### newViewState

`newViewState: ViewState`

The new view state that Carbon AI Chat has switched to. This new state can be changed by the event handler.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventViewChange.html#newviewstate)

### oldViewState

`oldViewState: ViewState`

The previous view state from before the view:pre:change event.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventViewChange.html#oldviewstate)

### reason

`reason: ViewChangeReason`

The reason the view is changing.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventViewChange.html#reason)

### type

`type: VIEW_CHANGE`

The type of this event.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventViewChange.html#type)
