# EndChatInfo

- Kind: Interface
- Category: Service desk
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.EndChatInfo.html

Additional info that may be provided when a chat is ended.

## Signature

```ts
interface EndChatInfo
```

## Members

### endedByHumanAgent

`endedByHumanAgent: boolean`

Indicates if the chat was ended by the agent (or by the service desk integration). If false, indicates the chat
was ended by the user or by Carbon AI Chat.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.EndChatInfo.html#endedbyhumanagent)

### preEndChatPayload

`preEndChatPayload: TPayloadType`

Before a chat is ended, a BusEventType.HUMAN_AGENT_PRE_END_CHAT is fired. The payload value assigned to this
event by a listener is provided here.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.EndChatInfo.html#preendchatpayload)
