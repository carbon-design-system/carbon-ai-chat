<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# BusEventMessageItemCustom

- Kind: Interface
- Category: Events
- Reference: https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/interfaces/Type_reference.BusEventMessageItemCustom.html

This describes a custom event that can be authored with the button response type of type "option". When clicked,
this event will fire and provide information authored in the custom event.

## Signature

```ts
interface BusEventMessageItemCustom
```

## Members

### fullMessage

`fullMessage: MessageResponse`

The full message response that contained the button item that triggered this custom event.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/interfaces/Type_reference.BusEventMessageItemCustom.html#fullmessage)

### messageItem

`messageItem: ButtonItem`

The button item that triggered this custom event.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/interfaces/Type_reference.BusEventMessageItemCustom.html#messageitem)

### type

`type: MESSAGE_ITEM_CUSTOM`

The type of this event.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/interfaces/Type_reference.BusEventMessageItemCustom.html#type)
