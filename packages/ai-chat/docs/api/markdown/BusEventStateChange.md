<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# BusEventStateChange

**Deprecated.** Use ChatInstance.state and call `state.select()` or `state.subscribe()` — removed in 2.0.0.

- Kind: Interface
- Category: Events
- Reference: https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.BusEventStateChange.html

This event is fired whenever the public state returned by ChatInstance.getState() changes.
This includes changes to viewState, showUnreadIndicator, and other persisted state.

## Signature

```ts
interface BusEventStateChange
```

## Members

### newState

`newState: PublicChatState`

**Deprecated.**

The new state after the change.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.BusEventStateChange.html#newstate)

### previousState

`previousState: PublicChatState`

**Deprecated.**

The previous state before the change.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.BusEventStateChange.html#previousstate)

### type

`type: STATE_CHANGE`

**Deprecated.**

The type of the event.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.BusEventStateChange.html#type)
