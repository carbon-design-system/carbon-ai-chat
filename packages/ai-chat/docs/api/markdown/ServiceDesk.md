# ServiceDesk

- Kind: Interface
- Category: Service desk
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ServiceDesk.html

This is the public interface for a human agent service desk integration. This is the interface between the chat
widget and the implementation of the human agent interface with one of the various supported service desks.

## Signature

```ts
interface ServiceDesk
```

## Members

### areAnyAgentsOnline

`areAnyAgentsOnline?: (connectMessage: MessageResponse) => Promise<boolean>`

Checks if any agents are online and can connect to a user when they become available. This does not necessarily
mean that an agent is immediately available; when a chat is started, the user may still have to wait for an
agent to become available. The callback function ServiceDeskCallback.updateAgentAvailability is used to
give the user more up-to-date information while they are waiting for an agent to become available.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ServiceDesk.html#areanyagentsonline)

### endChat

`endChat: (info: EndChatInfo<unknown>) => Promise<void>`

Tells the service desk to terminate the chat.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ServiceDesk.html#endchat)

### filesSelectedForUpload

`filesSelectedForUpload?: (uploads: FileUpload[]) => void`

Indicates that the user has selected some files to be uploaded but that the user has not yet chosen to send
them to the agent. This method can use this as an opportunity to perform any early validation of the files in
order to display an error to the user. It should not actually upload the files at this point. If the user
chooses to send the files to the agent, they will be included later when ServiceDesk#sendMessageToAgent is called.

This method may be called multiple times before a user sends the files.

If there are errors in the files, this method should use ServiceDeskCallback#setFileUploadStatus to update
the status with an error message. The user will not be able to upload any files until any files in error are
removed.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ServiceDesk.html#filesselectedforupload)

### getName

`getName?: () => string`

Returns a name for this service desk integration. This value should reflect the service desk that is being
integrated to (e.g. "genesys web messenger"). This information will be reported to IBM and may be used to gauge
interest in various service desks for the possibility of creating fully supported out-of-the-box implementations.

This value is required for custom service desks and may have a maximum of 40 characters.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ServiceDesk.html#getname)

### reconnect

`reconnect?: () => Promise<boolean>`

This will be called when the service desk is first initialized and it is determined that the user was previously
connected to an agent. This function should perform whatever steps are necessary to reconnect the user. Web chat
will assume the user is permitted to send messages and is connected to the same agent when this function resolves.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ServiceDesk.html#reconnect)

### screenShareStop

`screenShareStop?: () => Promise<void>`

Tells the service desk that the user has requested to stop sharing their screen.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ServiceDesk.html#screensharestop)

### sendMessageToAgent

`sendMessageToAgent: (message: MessageRequest, messageID: string, additionalData: AdditionalDataToAgent) => Promise<void>`

Sends a message to the agent in the service desk. Note that the message text may be empty if the user has
selected files to upload and has not chosen to include a message to go along with the files.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ServiceDesk.html#sendmessagetoagent)

### startChat

`startChat: (connectMessage: MessageResponse, startChatOptions: StartChatOptions) => Promise<void>`

Instructs the service desk to start a new chat. This will be called when a user requests to connect to an agent
and Carbon AI Chat initiates the process (typically when the user clicks the button on the "Connect to Agent" card).
It will make the appropriate calls to the service desk to start the chat and will make use of the callback to
inform Carbon AI Chat when an agent joins or messages are received.

This may be called multiple times by Carbon AI Chat. If a user begins a chat with an agent, ends the chat and then
begins a new chat with an agent, this function will be called again.

If the integration is unable to start a chat (such as if the service desk is down or no agents are available)
then this function should throw an error to let Carbon AI Chat know that the chat could not be started.

The areAnyAgentsOnline function is called before this function is called and is called as soon as a
"connect_to_agent" message has been received from the assistant. This determines if the "Connect to Agent" card
should be displayed to the user or if the "no agents are available" message configured in the skill should be
shown instead.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ServiceDesk.html#startchat)

### userReadMessages

`userReadMessages?: () => Promise<void>`

Informs the service desk that the user has read all the messages that have been sent by the service desk.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ServiceDesk.html#userreadmessages)

### userTyping

`userTyping?: (isTyping: boolean) => Promise<void>`

Tells the service desk if a user has started or stopped typing.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ServiceDesk.html#usertyping)
