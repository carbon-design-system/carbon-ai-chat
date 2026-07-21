# MessageResponse

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageResponse.html

This interface represents the main response content that is received by a client from an assistant. It is generally
in response to a previous message request.

## Signature

```ts
interface MessageResponse
```

## Members

### context

`context?: unknown`

The context information returned by the back-end.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageResponse.html#context)

### history

`history?: MessageResponseHistory`

The history information to store as part of this request.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageResponse.html#history)

### id

`id?: string`

A unique identifier for this response object.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageResponse.html#id)

### message_options

`message_options?: MessageResponseOptions`

Options for the MessageResponse. This includes metadata about the user or assistant sending this response.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageResponse.html#message_options)

### output

`output: MessageOutput<TGenericType>`

The output from the back-end to be rendered or processed by the client.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageResponse.html#output)

### request_id

`request_id?: string`

The id of the request that this is the response of.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageResponse.html#request_id)

### thread_id

`thread_id?: string`

The ID of the thread this request belongs to. This is here to prepare for input message editing and regenerating
responses.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageResponse.html#thread_id)
