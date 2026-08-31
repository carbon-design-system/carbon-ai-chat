# CustomSendMessageOptions

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.20.0-rc.0/docs/interfaces/Type_reference.CustomSendMessageOptions.html

## Signature

```ts
interface CustomSendMessageOptions
```

## Members

### busEventSend

`busEventSend?: BusEventSend`

The BusEventSend event that triggered this send. Use its `source`
field to distinguish which UI surface the user typed from:

- MessageSendSource.HOME_SCREEN_INPUT — the prompt line on the home
  screen (the chat has not yet left the home screen).
- MessageSendSource.MESSAGE_INPUT — the prompt line on the message
  list (the user is already in an active conversation).
- MessageSendSource.HOME_SCREEN_STARTER — a starter button on the
  home screen.
- MessageSendSource.OPTION_BUTTON / MessageSendSource.OPTION_DROP_DOWN
  — an option-response control.
- MessageSendSource.POST_BACK_BUTTON — a post-back button in a
  response.
- MessageSendSource.DATE_PICKER — a date-picker response.
- MessageSendSource.INSTANCE_SEND — a programmatic call to
  ChatInstance.send.
- MessageSendSource.WELCOME_REQUEST — the internally generated
  welcome request fired during hydration.

`busEventSend` is `undefined` when the send does not originate from the
event bus (for example, when called directly by internal plumbing).

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.0/docs/interfaces/Type_reference.CustomSendMessageOptions.html#buseventsend)

### signal

`signal: AbortSignal`

A signal to let customSendMessage to cancel a request if it has exceeded Carbon AI Chat's timeout.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.0/docs/interfaces/Type_reference.CustomSendMessageOptions.html#signal)

### silent

`silent: boolean`

If the message was sent with "silent" set to true to not be displayed in the conversation history.

[Reference](https://chat.carbondesignsystem.com/version/v1.20.0-rc.0/docs/interfaces/Type_reference.CustomSendMessageOptions.html#silent)
