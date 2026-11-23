<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# MessageRequest

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.MessageRequest.html

This is the main interface that represents a request from a user sent to an assistant.

A request can carry fields of your own, such as an ID from your back-end. The chat never reads them. It keeps
them unchanged in event data, in PublicConfigMessaging.customSendMessage, in chat state, and on
messages you load from history. To set them with type checking, declare them on your own type that extends
this one. Messages the chat hands back are typed without your fields, so check that a field is there before
you use it.

## Signature

```ts
interface MessageRequest
```

## Members

### context

`context?: unknown`

Optional context which is added from external resources.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.MessageRequest.html#context)

### history

`history?: MessageRequestHistory`

The history information to store as part of this request. This includes extra information that was provided to
the user and about the user that was used in making the request.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.MessageRequest.html#history)

### id

`id?: string`

The unique identifier for this request object. This value may be assigned by the client when a request is
made but should be assigned by the service if one is not provided.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.MessageRequest.html#id)

### input

`input: TInputType`

The input data to the back-end to make in this request.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.MessageRequest.html#input)

### parent_thread_id

`parent_thread_id?: string`

**Deprecated.** Removed in 2.0.0. Nothing replaces it, because the chat never used it. If you keep your own value
here, you can go on setting it. From 2.0.0, the chat carries it like any field of your own, typed `unknown`.

An ID for the parent of the thread this request belongs to. The chat doesn't set or use it.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.MessageRequest.html#parent_thread_id)

### thread_id

`thread_id?: string`

**Deprecated.** Removed in 2.0.0, and the chat stops setting it. Nothing replaces it, because the chat never used
it. If you keep your own value here, you can go on setting it. From 2.0.0, the chat carries it like any field
of your own, typed `unknown`.

An ID for the thread this request belongs to. If you leave it out, the chat sets it to `"main"`. The chat
doesn't use the value.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.MessageRequest.html#thread_id)

## Related

- [PublicConfigMessaging.customSendMessage](./PublicConfigMessaging.md)
