# ConnectToHumanAgentItemTransferInfo

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ConnectToHumanAgentItemTransferInfo.html

Additional information as part of a ConnectToHumanAgentItem that may be needed to perform a transfer to an agent.

## Signature

```ts
interface ConnectToHumanAgentItemTransferInfo
```

## Members

### additional_data

`additional_data?: { [key: string]: string }`

Each service desk may require different information to start the connection. It can be account details or
security information. This is a bucket of all the service desk specific properties.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ConnectToHumanAgentItemTransferInfo.html#additional_data)

### summary_message_to_agent

`summary_message_to_agent?: TextItem<Record<string, unknown>>[]`

An initial set of message items to send to the agent.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ConnectToHumanAgentItemTransferInfo.html#summary_message_to_agent)

## Related

- [ConnectToHumanAgentItem](./ConnectToHumanAgentItem.md)
