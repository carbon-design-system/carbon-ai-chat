# ServiceDeskCallback

- Kind: Interface
- Category: Service desk
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ServiceDeskCallback.html

This interface represents the operations that a service desk integration can call on Carbon AI Chat when it wants web
chat to do something. When a service desk integration instance is created, Carbon AI Chat will provide an
implementation of this interface to the integration for it to use.

## Signature

```ts
interface ServiceDeskCallback
```

## Members

### agentEndedChat

`agentEndedChat(): Promise<void>`

Informs the chat widget that the agent has ended the conversation.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ServiceDeskCallback.html#agentendedchat)

### agentJoined

`agentJoined(profile: ResponseUserProfile): Promise<void>`

Informs the chat widget that an agent has joined the chat.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ServiceDeskCallback.html#agentjoined)

### agentLeftChat

`agentLeftChat(): Promise<void>`

Informs the chat widget that the agent has left the conversation. This does not end the conversation itself,
rather the only action that occurs is the visitor receives the agent left status message. If the user sends
another message, it is up to the service desk to decide what to do with it.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ServiceDeskCallback.html#agentleftchat)

### agentReadMessages

`agentReadMessages(): Promise<void>`

Informs the chat widget that the agent has read all the messages that have been sent to the service desk.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ServiceDeskCallback.html#agentreadmessages)

### agentTyping

`agentTyping(isTyping: boolean): Promise<void>`

Tells the chat widget if an agent has started or stopped typing.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ServiceDeskCallback.html#agenttyping)

### beginTransferToAnotherAgent

`beginTransferToAnotherAgent(profile?: ResponseUserProfile): Promise<void>`

Informs the chat widget that a transfer to another agent is in progress. The agent profile information is
optional if the service desk doesn't have the information available. This message simply tells the chat widget
that the transfer has started. The service desk should inform the widget when the transfer is complete by
sending a agentJoined message later.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ServiceDeskCallback.html#begintransfertoanotheragent)

### persistedState

`persistedState(): TPersistedStateType`

Returns the persisted agent state from the store. This is the current state as updated by
updatePersistedState. The object returned here is frozen and may not be modified.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ServiceDeskCallback.html#persistedstate)

### screenShareEnded

`screenShareEnded(): Promise<void>`

Informs Carbon AI Chat that a screen sharing session has ended or been cancelled. This may occur while waiting for a
screen sharing request to be accepted or while screen sharing is in progress.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ServiceDeskCallback.html#screenshareended)

### screenShareRequest

`screenShareRequest(): Promise<ScreenShareState>`

Requests that the user share their screen with the agent. This will present a modal dialog to the user who must
respond before continuing the conversation. This method returns a Promise that resolves when the user has
responded to the request or the request times out.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ServiceDeskCallback.html#screensharerequest)

### sendMessageToUser

`sendMessageToUser(message: string | MessageResponse<GenericItem<Record<string, unknown>>[]>, agentID?: string): Promise<void>`

Sends a message to the chat widget from an agent.

Note: The text response type from the standard Watson API is supported in addition to the Carbon AI Chat specific
MessageResponseTypes.INLINE_ERROR response type.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ServiceDeskCallback.html#sendmessagetouser)

### setErrorStatus

`setErrorStatus(errorInfo: ServiceDeskErrorInfo): Promise<void>`

Sets the state of the given error type.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ServiceDeskCallback.html#seterrorstatus)

### setFileUploadStatus

`setFileUploadStatus(fileID: string, isError?: boolean, errorMessage?: string): Promise<void>`

Updates the status of a file upload. The upload may either be successful or an error may have occurred. The
location of a file upload may be in one of two places. The first occurs when the user has selected a file to be
uploaded but has not yet sent the file. In this case, the file appears inside the Carbon AI Chat input area. If an
error is indicated on the file, the error message will be displayed along with the file and the user must
remove the file from the input area before a message can be sent.

The second occurs after the user has sent the file and the service desk has begun to upload the file. In this
case, the file no longer appears in the input area but appears as a sent message in the message list. If an
error occurs during this time, an icon will appear next to the message to indicate an error occurred and an
error message will be added to the message list.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ServiceDeskCallback.html#setfileuploadstatus)

### updateAgentAvailability

`updateAgentAvailability(availability: AgentAvailability): Promise<void>`

Sends updated availability information to the chat widget for a user who is waiting to be connected to an
agent (e.g. the user is number 2 in line). This may be called at any point while waiting for the connection to
provide newer information.

Note: Of the fields in the AgentAvailability object, only one of positionInQueue and estimatedWaitTime can be
rendered in the widget. If both fields are provided, estimatedWaitTime will take priority and the
positionInQueue field will be ignored.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ServiceDeskCallback.html#updateagentavailability)

### updateCapabilities

`updateCapabilities(capabilities: Partial<ServiceDeskCapabilities>): void`

Updates Carbon AI Chat with the capabilities supported by the service desk. Some of these capabilities may support
being changed dynamically and can be updated at any time.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ServiceDeskCallback.html#updatecapabilities)

### updatePersistedState

`updatePersistedState(state: DeepPartial<TPersistedStateType>, mergeWithCurrent?: boolean): void`

Allows the service desk to store state that may be retrieved when Carbon AI Chat is reloaded on a page. This information
is stored in browser session storage which has a total limit of 5MB per origin so the storage should be used
sparingly. Also, the value provided here must be JSON serializable.

When Carbon AI Chat is reloaded, the data provided here will be returned to the service desk via the
ServiceDeskFactoryParameters.persistedState property. This data may also be retrieved by using the
persistedState method.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ServiceDeskCallback.html#updatepersistedstate)
