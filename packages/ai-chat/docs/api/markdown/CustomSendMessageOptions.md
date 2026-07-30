# CustomSendMessageOptions

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CustomSendMessageOptions.html

## Signature

```ts
interface CustomSendMessageOptions
```

## Members

### busEventSend

`busEventSend?: BusEventSend`

BusEventSend provides extra context such as MessageSendSource.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CustomSendMessageOptions.html#buseventsend)

### signal

`signal: AbortSignal`

A signal to let customSendMessage to cancel a request if it has exceeded Carbon AI Chat's timeout.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CustomSendMessageOptions.html#signal)

### silent

`silent: boolean`

If the message was sent with "silent" set to true to not be displayed in the conversation history.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CustomSendMessageOptions.html#silent)
