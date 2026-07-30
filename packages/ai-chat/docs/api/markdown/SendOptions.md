# SendOptions

- Kind: Interface
- Category: Instance
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.SendOptions.html

This interface represents the options for when a MessageRequest is sent to the server with the send method.

## Signature

```ts
interface SendOptions
```

## Members

### silent

`silent?: boolean`

If you want to send a message to the API, but NOT have it show up in the UI, set this to true. The "pre:send"
and "send" events will still be fired but the message will not be added to the local message list displayed in
the UI. Note that the response message will still be added.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.SendOptions.html#silent)
