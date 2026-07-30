# HistoryItem

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.HistoryItem.html

A single interaction in the Session History.

## Signature

```ts
interface HistoryItem
```

## Members

### message

`message: MessageRequest<MessageInput> | MessageResponse<GenericItem<Record<string, unknown>>[]>`

The message represented by this history item.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.HistoryItem.html#message)

### time

`time: string`

Time this message occurred. ISO Format (e.g. 2020-03-15T08:59:56.952Z).

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.HistoryItem.html#time)
