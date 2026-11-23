<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# MessageResponse

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.MessageResponse.html

This interface represents the main response content that is received by a client from an assistant. It is generally
in response to a previous message request.

A response can carry fields of your own, such as an ID from your back-end. The chat never reads them. It keeps
them unchanged in event data, in chat state, and on messages you load from history. To set them with type
checking, declare them on your own type that extends this one. Messages the chat hands back are typed without
your fields, so check that a field is there before you use it.

## Signature

```ts
interface MessageResponse
```

## Members

### context

`context?: unknown`

The context information returned by the back-end.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.MessageResponse.html#context)

### history

`history?: MessageResponseHistory`

The history information to store as part of this request.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.MessageResponse.html#history)

### id

`id?: string`

A unique identifier for this response object.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.MessageResponse.html#id)

### message_options

`message_options?: MessageResponseOptions`

Options for the MessageResponse. This includes metadata about the user or assistant sending this response.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.MessageResponse.html#message_options)

### output

`output: MessageOutput<TGenericType>`

The output from the back-end to be rendered or processed by the client.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.MessageResponse.html#output)

### request_id

`request_id?: string`

The ID of the request this response answers. Use the MessageRequest.id passed to
PublicConfigMessaging.customSendMessage. If that request belongs to a conversation
restarted or cleared on this instance, the chat ignores the response. Omitted or unknown IDs
keep the existing behavior and do not provide this protection. Request IDs must be unique
across conversations on the instance. Include this ID on every response update.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.MessageResponse.html#request_id)

### thread_id

`thread_id?: string`

**Deprecated.** Removed in 2.0.0, and the chat stops setting it. Nothing replaces it, because the chat never used
it. If you keep your own value here, you can go on setting it. From 2.0.0, the chat carries it like any field
of your own, typed `unknown`.

An ID for the thread this response belongs to. If you leave it out, the chat sets it to `"main"`. The chat
doesn't use the value.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.MessageResponse.html#thread_id)
