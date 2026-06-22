---
title: Service desks
---

### Overview

Integrate a custom service desk or contact center so users can talk to human agents. Create an object or class that satisfies the {@link ServiceDesk} interface, then return it from a factory function in your configuration. The Carbon AI Chat calls that factory when it needs an instance of your integration.

An integration takes two steps:

1. Write code to communicate with the service desk, for actions like starting a conversation or sending messages to a human agent. Make sure the code meets the API the Carbon AI Chat specifies.
2. Give the Carbon AI Chat access to that code through a factory function so it can run it.

Provide your service desk integration to the container components as top‑level props. If you haven't set up a container yet, see [React](./React.md) or [Web component](./WebComponent.md) first.

- React: `<ChatContainer serviceDeskFactory={...} serviceDesk={{ ... }} />`
- Web component (float): `<cds-aichat-container .serviceDeskFactory=${'{}'} .serviceDesk=${'{}'} />`
- Web component (custom element): `<cds-aichat-custom-element .serviceDeskFactory=${'{}'} .serviceDesk=${'{}'} />`

### Service desk requirements

To create an integration between the Carbon AI Chat and a service desk, the service desk must fulfill the Carbon AI Chat service desk API. Use the HTTP endpoints that the service desk or the web socket interface provides. The service desk must let you start a chat, receive user messages, and deliver agent messages to the user.

If the service desk requires calls to include secrets that cannot be exposed to end users, such as API keys, use middleware on your server to handle the calls. Proxy the calls from the Carbon AI Chat. This middleware receives the calls from the Carbon AI Chat and forwards them to the service desk along with the additional secret.

If the service desk operates on a domain different from your website, make sure that it supports CORS to handle requests from a web browser. Without CORS support, you can proxy the requests through your own server, eliminating the need for CORS.

### Basic example

If you implement a service integration that satisfies the service desk API, getting the Carbon AI Chat to use it requires a factory function to create a new instance of your integration. The example shows an empty integration (that doesn't communicate with a service desk) to show how to register an integration with the Carbon AI Chat.

```tsx
// Your custom service desk integration which can be located anywhere in your codebase.
class MyServiceDesk {
  constructor(callback) {
    this.callback = callback;
  }
  startChat() {
    // This code communicates with the SD to start the chat and is expected to eventually result in
    // "callback.agentJoined" being called when an agent is available and "callback.sendMessageToUser"
    // when the agent sends a message to the user.
    // ...
  }
  endChat() {
    // This code communicates with the SD to tell it the chat was ended.
    // ...
  }
  sendMessageToAgent() {
    // This code communicates with the SD to give the message from the user to an agent.
    // ...
  }
}

// React usage
<ChatContainer
  serviceDeskFactory={(parameters) => new MyServiceDesk(parameters)}
  serviceDesk={{ allowReconnect: true }}
  // ...other flattened config props
/>;
```

### Keep the service desk factory stable

Changing `serviceDeskFactory` at runtime ends any connecting or active human‑agent chat and reinitializes the integration, so prefer a stable factory identity.

React (stable via useCallback):

```tsx
const myFactory = useCallback(
  (params: ServiceDeskFactoryParameters) => new MyServiceDesk(params),
  [],
);

<ChatContainer serviceDeskFactory={myFactory} />;
```

Web Components / Lit (stable class field):

```ts
@customElement("my-app")
export class MyApp extends LitElement {
  private readonly serviceDeskFactory = (
    params: ServiceDeskFactoryParameters,
  ) => new MyServiceDesk(params);
  render() {
    return html`<cds-aichat-container
      .serviceDeskFactory=${this.serviceDeskFactory}
    />`;
  }
}
```

### API overview

The Carbon AI Chat provides a public API that your custom code implements so the Carbon AI Chat can communicate with a service desk. This communication integrates into the Carbon AI Chat visual experience. The API provides functions such as {@link ServiceDesk.startChat} to let the service desk know when a chat starts and {@link ServiceDesk.sendMessageToAgent} to send a message from the user to an agent. The Carbon AI Chat also provides a callback API so the service desk can talk back to the Carbon AI Chat. It includes functions like {@link ServiceDeskCallback.agentJoined} to let the Carbon AI Chat know when an agent joins the chat and {@link ServiceDeskCallback.sendMessageToUser} when the agent sends a message to display to the user.

#### Communicating from the Carbon AI Chat to your service desk

The `serviceDeskFactory` configuration property expects a factory function that returns an object of functions or a class. The factory receives {@link ServiceDeskFactoryParameters}. The Carbon AI Chat calls the class or functions returned from the factory as needed to communicate with your integration.

#### Communicating from your service desk to the Carbon AI Chat

The factory receives a callback object in {@link ServiceDeskFactoryParameters}. These callbacks are the functions you call inside your service desk code to communicate information back to the Carbon AI Chat.

#### Interaction flow

These are the steps that happen when a user connects to a service desk. They also show how the Carbon AI Chat interacts with the service desk integration.

1. When the Carbon AI Chat starts, it creates a single instance of the service desk integration through the `serviceDeskFactory` prop.
2. A user sends a message to the assistant and it returns a "Connect to Agent" response (response_type="connect_to_agent").
3. If the service desk integration implements it, the Carbon AI Chat calls {@link ServiceDesk.areAnyAgentsOnline} to find out whether any agents are online. The result decides whether the Carbon AI Chat displays a "request agent" button or the "no agents available" message instead.
4. User clicks the "request agent" button.
5. The Carbon AI Chat calls {@link ServiceDesk.startChat} on the integration. The integration asks the service desk to start a new chat.
6. A banner displays to the user to indicate that the Carbon AI Chat is connecting them to an agent.
7. If the service desk provides the capability, the integration calls {@link ServiceDeskCallback.updateAgentAvailability} to update the banner with how long the wait is.
8. When an agent becomes available, the integration calls {@link ServiceDeskCallback.agentJoined} and the Carbon AI Chat informs the user that an agent is joining.
9. When an agent sends a message, the integration calls {@link ServiceDeskCallback.sendMessageToUser}.
10. When the user sends a message, the Carbon AI Chat calls {@link ServiceDesk.sendMessageToAgent}.
11. The user ends the chat.
12. The Carbon AI Chat calls {@link ServiceDesk.endChat} on the integration, which tells the service desk that the chat is over.

### API details

Implement these methods from the {@link ServiceDesk} interface in your integration:

- {@link ServiceDesk.getName}
- {@link ServiceDesk.startChat}
- {@link ServiceDesk.endChat}
- {@link ServiceDesk.sendMessageToAgent}
- {@link ServiceDesk.userReadMessages} (optional)
- {@link ServiceDesk.areAnyAgentsOnline} (optional)

Call these methods on the {@link ServiceDeskCallback} interface from your integration:

- {@link ServiceDeskCallback.agentEndedChat}
- {@link ServiceDeskCallback.agentJoined}
- {@link ServiceDeskCallback.agentLeftChat}
- {@link ServiceDeskCallback.agentReadMessages}
- {@link ServiceDeskCallback.agentTyping}
- {@link ServiceDeskCallback.beginTransferToAnotherAgent}
- {@link ServiceDeskCallback.sendMessageToUser}
- {@link ServiceDeskCallback.setErrorStatus}
- {@link ServiceDeskCallback.setFileUploadStatus}
- {@link ServiceDeskCallback.updateAgentAvailability}
- {@link ServiceDeskCallback.updateCapabilities}

### Supported response types

The {@link ServiceDeskCallback.sendMessageToUser} function lets your integration display a message to the user. You can provide a string, which displays a basic text response to the user. You can also pass a {@link MessageResponse} object with one of these {@link MessageResponseTypes}:

- text
- image
- video
- inline_error
- button (the link button type is the only supported type)
- user_defined

> **Note:** The Carbon AI Chat supports markdown in text responses.

### File uploads

Users can select local files to upload to an agent. To enable uploads, your integration takes these steps.

#### Enable file uploads

First, tell the Carbon AI Chat your service desk supports uploads by calling {@link ServiceDeskCallback.updateCapabilities}. It can also tell the Carbon AI Chat whether it supports multiple files and what filter to apply to the operating system file select dialog. Call this function at any time, including to change the current capabilities. For example, if your service desk blocks uploads until an agent requests them, wait to call this function until the user receives such a message from the agent.

```ts
this.callback.updateCapabilities({
  allowFileUploads: true,
  allowedFileUploadTypes: "image/*,.txt",
  allowMultipleFileUploads: true,
});
```

#### Validating files before uploading

When a user selects files to upload, the Carbon AI Chat calls {@link ServiceDesk.filesSelectedForUpload} in your integration. Use this function to validate that the file is appropriate for uploading. Check the file's type or size and report an error if it isn't valid. The user must remove any files in error before sending a message with the files. Report the error by calling {@link ServiceDeskCallback.setFileUploadStatus}.

```ts
filesSelectedForUpload(uploads: FileUpload[]): void {
  uploads.forEach(upload => {
    if (upload.file.size > this.maxFileSizeKB * 1024) {
      const maxSize = `${this.maxFileSizeKB}KB`;
      const errorMessage = `File exceeds ${maxSize}`;
      this.callback.setFileUploadStatus(upload.id, true, errorMessage);
    }
  });
}
```

#### Handling uploaded files

After you enable file uploads, the user can select files and upload them to an agent by sending them as a "message". The Carbon AI Chat passes the {@link FileUpload} objects to your integration through {@link ServiceDesk.sendMessageToAgent} as the `additionalData.filesToUpload` argument.

> **Note:** The user does not need to type a message, so the `message.input.text` value can be empty.

Once your integration receives the files, it sends them to the service desk however your service desk requires.

```ts
async sendMessageToAgent(message: MessageRequest, messageID: string, additionalData: AdditionalDataToAgent) {
  if (message.input.text) {
    // Send the user's text input to the service desk.
    // ...
  }

  if (additionalData.filesToUpload.length) {
    // Execute whatever operation is necessary to send the files to the service desk.
    // ...
  }
}
```

#### Updating file upload status

When your integration completes a file upload or stops it because of an error, report the status to the user with {@link ServiceDeskCallback.setFileUploadStatus}.

```ts
// Called when the service desk has reported an error.
this.callback.setFileUploadStatus(file.id, true, errorMessage);
```

### Screen sharing

You can integrate screen sharing or co-browse from your service desk. The service desk API lets your integration ask the user to approve a screen sharing request from the agent, then lets the user stop sharing whenever they want.

> **Note:** The Carbon AI Chat does not provide the screen sharing functions, only the request for permission from the user. The service desk integration provides the screen sharing capability.

To begin a screen sharing session, call {@link ServiceDeskCallback.screenShareRequest}. The Carbon AI Chat displays a modal asking the user to approve the request to begin screen sharing. This function returns a Promise that resolves when the user responds, and the resolution value is the user's response.

The integration can stop screen sharing at any point, including while waiting for the user to approve a request. Use the latter to implement a timeout if you want to give the user a limited amount of time to respond before cancelling the request. An appropriate message displays to the user. To end screen sharing, call {@link ServiceDeskCallback.screenShareEnded}.

The user can stop screen sharing at any point. When the user stops, the Carbon AI Chat calls {@link ServiceDesk.screenShareStop} on your integration.

### Reconnecting sessions

If the service desk you connect to lets users reconnect to an agent after the page reloads, the Carbon AI Chat supports this process. The Carbon AI Chat tracks whether a user connects to an agent between page loads. If the Carbon AI Chat loads and detects that the user was previously connected to an agent, it gives the service desk integration a chance to reconnect. The Carbon AI Chat calls {@link ServiceDesk.reconnect} if it exists on the integration. The service desk then reconnects however it needs to, and once the reconnect completes or fails, {@link ServiceDesk.reconnect} resolves with a boolean to indicate whether reconnection succeeded.

> **Note:** The user can't interact with the Carbon AI Chat until {@link ServiceDesk.reconnect} resolves or the user chooses to disconnect from the service desk.

If the integration needs to record state between page loads, it can use {@link ServiceDeskCallback.updatePersistedState}. {@link ServiceDeskCallback.updatePersistedState} stores the provided data in the browser's session history along with the session data the Carbon AI Chat stores. The session storage has a size limit, so avoid putting large amounts of data here.

#### Handling service desks that don't support reconnection

Not all service desks support reconnecting users to their previous agent conversations after a page refresh. The Carbon AI Chat handles these scenarios gracefully:

**Option 1: Don't implement the {@link ServiceDesk.reconnect} method (recommended for unsupported service desks)**

If your service desk doesn't support reconnection, don't include a {@link ServiceDesk.reconnect} method in your integration. The Carbon AI Chat skips any reconnection attempts.

```ts
class MyServiceDesk {
  startChat() {
    /* ... */
  }
  endChat() {
    /* ... */
  }
  sendMessageToAgent() {
    /* ... */
  }
  // No reconnect method = no reconnection attempts
}
```

**Option 2: Implement {@link ServiceDesk.reconnect} and return `false`**

If you want to explicitly handle the reconnection attempt, implement the method and return `false`:

```ts
class MyServiceDesk {
  async reconnect() {
    // Your service desk doesn't support reconnection
    return false; // This ends the chat gracefully
  }
}
```

**Option 3: Disable reconnection via configuration**

You can also disable reconnection attempts entirely through configuration:

```tsx
<ChatContainer
  serviceDeskFactory={myFactory}
  serviceDesk={{ allowReconnect: false }}
/>
```

#### What happens when reconnection fails or isn't supported

When reconnection is not possible, the Carbon AI Chat does the following:

1. **Connection state is cleared**: The Carbon AI Chat ends the chat session.
2. **User notification**: The user sees the message "You disconnected from the live agent."
3. **Assistant continues**: After a brief delay, the conversation continues with the assistant.
4. **Fresh start**: The user can start a new agent conversation if needed.

The user can then start a new agent conversation.

### Related

- [Message format](./MessageFormat.md) — the {@link MessageResponse} shapes your integration sends to the user.
- [Using with React](./React.md) — set up the container component before wiring `serviceDeskFactory`.
- [Using as a Web component](./WebComponent.md) — set up the web component container before wiring `serviceDeskFactory`.
