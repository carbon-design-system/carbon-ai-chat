---
title: Service desks
---

### Overview

The Carbon AI Chat supports you in creating a custom integration with a service desk or contact center that users can use to communicate with human agents. To build an integration, create an object or class that satisfies the Carbon AI Chat {@link ServiceDesk} interface. Then implement a factory function in the Carbon AI Chat configuration that returns a new instance of your integration when the Carbon AI Chat asks for one.

For the Carbon AI Chat to integrate with a custom service desk, two basic steps need to happen:

1. Write code to communicate with the service desk, enabling actions like starting a conversation or sending messages to a human agent. Make sure that the code meets the API requirements that the Carbon AI Chat specifies.
2. Give the Carbon AI Chat access to that code by using a factory function, so it can run it.

Provide your service desk integration to the container components as top‑level props:

- React: `<ChatContainer serviceDeskFactory={...} serviceDesk={{ ... }} />`
- Web component (float): `<cds-aichat-container .serviceDeskFactory=${'{}'} .serviceDesk=${'{}'} />`
- Web component (custom element): `<cds-aichat-custom-element .serviceDeskFactory=${'{}'} .serviceDesk=${'{}'} />`

### Service desk requirements

To create an integration between the Carbon AI Chat and a service desk, the service desk must fulfill the Carbon AI Chat service desk API. Use the HTTP endpoints that the service desk or the web socket interface provides. In particular, the service desk must support the ability to start a chat to receive messages from a user or to deliver messages from an agent to the user.

If the service desk requires calls to include secrets that cannot be exposed to end users, such as API keys, use middleware on your server to handle the calls. Proxy the calls from the Carbon AI Chat. This middleware receives the calls from the Carbon AI Chat and forwards them to the service desk along with the additional secret.

If the service desk operates on a domain different from your website, make sure that it supports CORS to handle requests from a web browser. Without CORS support, you can proxy the requests through your own server, eliminating the need for CORS.

### Basic example

If you implement a service integration that satisfies the service desk API, getting the Carbon AI Chat to use it requires a factory function to create a new instance of your integration. The example shows an empty integration (that doesn't communicate with a service desk) to show how to register an integration with the Carbon AI Chat. See the following example:

```javascript
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

Because changing `serviceDeskFactory` at runtime will end any connecting/active human‑agent chat and reinitialize the integration, prefer a stable factory identity.

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

### API Overview

The Carbon AI Chat provides a public API that you can implement by custom code that enables the Carbon AI Chat to communicate with a service desk. This communication integrates into the Carbon AI Chat visual experience. The API provides functions such as `startChat` to let the SD know when a chat starts and `sendMessageToAgent` to send a message from the user to an agent. In addition, the Carbon AI Chat provides a callback API that allows the SD to talk back to the Carbon AI Chat. It includes functions like `agentJoined` to let the Carbon AI Chat know when an agent joins the chat and `sendMessageToUser` when the agent sends a message to display to the user.

#### Communicating from the Carbon AI Chat to your service desk

The `serviceDeskFactory` configuration property expects a factory function that returns an object of functions or a class. The TypeScript definitions document the factory function and the parameters that are passed to it. The Carbon AI Chat calls the class or functions that return from the factory as needed to communicate with your integration.

#### Communicating from your service desk to the Carbon AI Chat

One of the items that are passed into the factory is a callback object. The TypeScript definitions document these callbacks. These callbacks are the functions that you call inside your service desk code to communicate information back to the Carbon AI Chat.

#### Interaction flow

The following section outlines the steps and actions that typically occur when a user connects to a service desk. It also explains how the Carbon AI Chat interacts with the service desk integration.

1. When the Carbon AI Chat starts, it creates a single instance of the service desk integration by using the `serviceDeskFactory` prop.
2. A user sends a message to the assistant and it returns a "Connect to Agent" response (response_type="connect_to_agent").
3. If the service desk integration implements it, the Carbon AI Chat calls `areAnyAgentsOnline` to determine whether any agents are online. This determines whether the Carbon AI Chat displays a "request agent" button or if it shows the "no agents available" message instead.
4. User clicks the "request agent" button.
5. The Carbon AI Chat calls the `startChat` function on the integration. The integration asks the service desk to start a new chat.
6. A banner displays to the user to indicate that the Carbon AI Chat is connecting them to an agent.
7. If the service desk provides the capability, the integration calls `callback.updateAgentAvailability` to update the banner to let the user know how long the wait is.
8. When an agent becomes available, the integration calls `callback.agentJoined` and the Carbon AI Chat informs the user that an agent is joining.
9. When an agent sends a message, the integration calls `callback.sendMessageToUser`.
10. When the user sends a message, the Carbon AI Chat calls `sendMessageToAgent`.
11. The user ends the chat.
12. The Carbon AI Chat calls `endChat` on the integration, which tells the service desk that the chat is over.

### API Details

Implement the following methods from the {@link ServiceDesk} interface in your integration:

- getName
- startChat
- endChat
- sendMessageToAgent
- updateState (optional)
- userReadMessages (optional)
- areAnyAgentsOnline (optional)

You can use the following methods from the {@link ServiceDeskCallback} interface in your integration:

- agentEndedChat
- agentJoined
- agentLeftChat
- agentReadMessages
- agentTyping
- beginTransferToAnotherAgent
- sendMessageToUser
- setErrorStatus
- setFileUploadStatus
- updateAgentAvailability
- updateCapabilities

### Supported response types

The `callback.sendMessageToUser` function lets your integration display a message to the user. You can provide a simple string, which displays a basic text response to the user. In addition, you can pass a {@link MessageResponse} object with the following response types:

- text
- image
- video
- inline_error
- button (At the moment, the link button type is the only supported type.)
- user_defined

**Note:** The Carbon AI Chat supports markdown in text responses.

### File uploads

The Carbon AI Chat supports the ability to allow users to select local files to upload to an agent. To use this functionality, your integration needs to perform the following steps.

#### Enable file uploads

The first step is for your service desk to tell the Carbon AI Chat that it supports file uploads by using the `callback.updateCapabilities` function. It can also tell the Carbon AI Chat if it supports multiple files and what filter to apply to the operating system file select dialog. You can call this function at any time and you can call it to change the current capabilities. For example, if your service desk does not allow to upload files until an agent requests files from the user, you can wait to call this function until the user receives such a message from the agent. Refer to the following example for `callback.updateCapabilities`.

```javascript
this.callback.updateCapabilities({
  allowFileUploads: true,
  allowedFileUploadTypes: "image/*,.txt",
  allowMultipleFileUploads: true,
});
```

#### Validating files before uploading

When a user selects files to upload, the Carbon AI Chat calls the `filesSelectedForUpload` function in your integration. You can use this function to validate that the file is appropriate for uploading. You can check the file's type or file size and report an error if it is not valid. The user must remove any files that are in error before sending a message with the files. You can report the error by calling the following `callback.setFileUploadStatus` function.

```javascript
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

After you enabled file uploads from the user, the user can select files and upload them to an agent. It occurs by the user sending the files as a "message". The files pass to your integration when you call the `sendMessageToAgent` function. The files pass as the `additionalData.filesToUpload` argument.

**Note:** The user does not need to type a message, so the `message.input.text` value can be empty.

Once your integration receives the files to upload, it should perform whatever operations are necessary to actually send the files to the service desk. Refer to the following example for `sendMessageToAgent`.

```javascript
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

When your integration completes a file upload successfully or stops it due to an error, it should report the status to the user using the `callback.setFileUploadStatus` function.

```javascript
// Called when the service desk has reported an error.
this.callback.setFileUploadStatus(file.id, true, errorMessage);
```

### Screen sharing

The Carbon AI Chat provides the ability to integrate with screen sharing or co-browse capabilities a service desk provides. The service desk API in the Carbon AI Chat allows the integration to ask the user to approve a screen sharing request from the agent and then it gives the user the ability to stop screen sharing when he wishes.

**Note:** The Carbon AI Chat does not provide the screen sharing functions, only the ability to request permission from the user. The service desk integration provides the screen sharing capability.

To begin a screen sharing session, you need to call the `callback.screenShareRequest` function. After the call, the Carbon AI Chat displays a modal to the user asking if he wants to approve the request to begin screen sharing. This function returns a Promise that resolves when the user responds to the request and the resolution value is the user's response.

The integration can stop screen sharing at any point, including while waiting for the user to approve a request. You can use the latter to implement a timeout if you only wish to give the user a certain amount of time to respond before cancelling the request. An appropriate message displays to the user. To end screen sharing, call the `callback.screenShareStop` function.

The user may stop screen sharing at any point. If the user stops screen sharing, the Carbon AI Chat calls the `screenShareStop` function on your integration.

### Reconnecting sessions

If the service desk you are connecting to allows users to reconnect to an agent after the page reloads, the Carbon AI Chat provides support to enable this process. The Carbon AI Chat keeps track of whether a user connects to an agent between page loads. If the Carbon AI Chat loads and detects that the user was previously connected to an agent, it gives the service desk integration an opportunity to reconnect. Call the `reconnect` function if it exists on the integration. The service desk then performs whatever steps are necessary to reconnect and once the reconnect is complete (or fails), the `reconnect` function resolves with a boolean to indicate successful reconnection.

**Note:** The user is unable to interact with the Carbon AI Chat until the `reconnect` function resolves or the user chooses to disconnect from the service desk.

If the integration needs to record a state between page loads, it can use the `updatePersistedState` function. The `updatePersistedState` persists the provided data in the browser's session history along with the session data that the Carbon AI Chat stores. The session storage has a size limit, so avoid putting large amounts of data here.

#### Handling service desks that don't support reconnection

Not all service desks support reconnecting users to their previous agent conversations after a page refresh. The Carbon AI Chat handles these scenarios gracefully:

**Option 1: Don't implement the `reconnect` method (recommended for unsupported service desks)**

If your service desk doesn't support reconnection, simply don't include a `reconnect` method in your integration. The Carbon AI Chat will skip any reconnection attempts.

```javascript
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

**Option 2: Implement `reconnect` and return `false`**

If you want to explicitly handle the reconnection attempt, implement the method and return `false`:

```javascript
class MyServiceDesk {
  async reconnect() {
    // Your service desk doesn't support reconnection
    return false; // This will end the chat gracefully
  }
}
```

**Option 3: Disable reconnection via configuration**

You can also disable reconnection attempts entirely through configuration:

```javascript
<ChatContainer
  serviceDeskFactory={myFactory}
  serviceDesk={{ allowReconnect: false }}
/>
```

#### What happens when reconnection fails or isn't supported

When reconnection is not possible, the Carbon AI Chat provides a clean user experience:

1. **Connection state is cleared**: The chat session is properly ended
2. **User notification**: The user sees the message "You disconnected from the live agent."
3. **Assistant continues**: After a brief delay, the conversation continues with the assistant
4. **Fresh start**: The user can start a new agent conversation if needed

This ensures that users are never stuck in a broken state and can continue their interaction with the chat system.
