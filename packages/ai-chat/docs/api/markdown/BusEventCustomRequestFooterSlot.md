<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# BusEventCustomRequestFooterSlot

- Kind: Interface
- Category: Events
- Reference: https://chat.carbondesignsystem.com/version/v1.22.0/docs/interfaces/Type_reference.BusEventCustomRequestFooterSlot.html

Used to populate the custom footer slot below a user message.

This fires once per user message each time it enters the store, which includes a history restore. Three kinds of message get no footer and
so fire nothing: a silent message, which never renders; a message carrying only file attachments, which renders
its chips without a bubble; and a message typed to a human agent, which the chat sends on a separate path.

## Signature

```ts
interface BusEventCustomRequestFooterSlot
```

## Members

### data

`data: { message: MessageRequest; slotName: string }`

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0/docs/interfaces/Type_reference.BusEventCustomRequestFooterSlot.html#data)

### type

`type: CUSTOM_REQUEST_FOOTER_SLOT`

The type of this event.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0/docs/interfaces/Type_reference.BusEventCustomRequestFooterSlot.html#type)
