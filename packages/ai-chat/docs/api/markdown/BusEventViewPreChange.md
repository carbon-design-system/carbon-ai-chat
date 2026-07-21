# BusEventViewPreChange

- Kind: Interface
- Category: Events
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventViewPreChange.html

Fires before the view state is updated in the store. This event is awaited, making it ideal for async operations like animations.

**Event Timing:**
1. VIEW_PRE_CHANGE fires (awaited)
2. View state is updated in store
3. VIEW_CHANGE fires (awaited)

**Use cases:**
- Run animations before the view changes
- Modify the new view state before it's applied
- Cancel the view change entirely

## Signature

```ts
interface BusEventViewPreChange
```

## Members

### cancelViewChange

`cancelViewChange: boolean`

This is used by the event handler to indicate that the view change should be cancelled and Carbon AI Chat's view should
not be changed.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventViewPreChange.html#cancelviewchange)

### newViewState

`newViewState: ViewState`

The new view state that Carbon AI Chat is going to switch to. This new state can be changed by the event handler.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventViewPreChange.html#newviewstate)

### oldViewState

`oldViewState: ViewState`

The previous view state before this event.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventViewPreChange.html#oldviewstate)

### reason

`reason: ViewChangeReason`

The reason the view is changing.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventViewPreChange.html#reason)

### type

`type: VIEW_PRE_CHANGE`

The type of this event.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventViewPreChange.html#type)
