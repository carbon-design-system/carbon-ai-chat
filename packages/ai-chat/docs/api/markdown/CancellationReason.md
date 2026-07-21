# CancellationReason

- Kind: Enum
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.CancellationReason.html

Reasons why a message request was cancelled via the abort signal.

## Signature

```ts
enum CancellationReason
```

## Members

### CONVERSATION_RESTARTED

`CONVERSATION_RESTARTED = "Conversation restarted"`

User restarted or cleared the conversation.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.CancellationReason.html#conversation_restarted)

### STOP_STREAMING

`STOP_STREAMING = "Stop streaming"`

User clicked the "stop streaming" button during message streaming.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.CancellationReason.html#stop_streaming)

### TIMEOUT

`TIMEOUT = "Request timeout"`

Message request exceeded the configured timeout duration.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.CancellationReason.html#timeout)
