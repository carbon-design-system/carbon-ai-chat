# MessageRequest

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageRequest.html

This is the main interface that represents a request from a user sent to an assistant.

## Signature

```ts
interface MessageRequest
```

## Members

### context

`context?: unknown`

Optional context which is added from external resources.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageRequest.html#context)

### history

`history?: MessageRequestHistory`

The history information to store as part of this request. This includes extra information that was provided to
the user and about the user that was used in making the request.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageRequest.html#history)

### id

`id?: string`

The unique identifier for this request object. This value may be assigned by the client when a request is
made but should be assigned by the service if one is not provided.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageRequest.html#id)

### input

`input: TInputType`

The input data to the back-end to make in this request.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageRequest.html#input)

### parent_thread_id

`parent_thread_id?: string`

The parent ID of the thread this request belongs to. This is here to prepare for input message editing and regenerating
responses.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageRequest.html#parent_thread_id)

### thread_id

`thread_id?: string`

The ID of the thread this request belongs to. This is here to prepare for input message editing and regenerating
responses.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageRequest.html#thread_id)
