---
title: Service desks
---

## Overview

Connect a custom service desk or contact center so users can talk to human agents. Create an object or class that meets the {@link ServiceDesk} interface, then return it from a factory function in your config. Carbon AI Chat calls that factory when it needs an instance of your integration.

An integration takes two steps:

1. Write code that talks to the service desk to handle actions like starting a conversation or sending messages to a human agent. Make sure the code meets the API that Carbon AI Chat specifies.
2. Give Carbon AI Chat access to that code through a factory function so it can run it.

Pass your service desk integration to the container components as top‑level props. If you haven't set up a container yet, see [React](./React.md) or [Web component](./WebComponent.md) first.

- React: `<ChatContainer serviceDeskFactory={...} serviceDesk={{ ... }} />`
- Web component (float): `<cds-aichat-container .serviceDeskFactory=${'{}'} .serviceDesk=${'{}'} />`
- Web component (custom element): `<cds-aichat-custom-element .serviceDeskFactory=${'{}'} .serviceDesk=${'{}'} />`

## Service desk requirements

To connect Carbon AI Chat to a service desk, the service desk must fulfill the Carbon AI Chat service desk API. Use the HTTP endpoints or web socket interface that the service desk provides. The service desk must let you start a chat, receive user messages, and deliver agent messages to the user.

Some service desk calls must include secrets you can't expose to end users, like API keys. For those calls, use middleware on your server to handle them. The middleware proxies the call from Carbon AI Chat, receiving it and then forwarding it to the service desk with the added secret.

If the service desk runs on a different domain from your website, make sure it supports CORS to handle requests from a web browser. Without CORS support, you can proxy the requests through your own server, which removes the need for CORS.

## Basic example

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

## Keep the service desk factory stable

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

## API overview

Carbon AI Chat provides a public API that your custom code implements, and it calls that API to communicate with a service desk. This communication becomes part of the Carbon AI Chat visual experience.

The API provides functions for Carbon AI Chat to call. For example, {@link ServiceDesk.startChat | startChat} tells the service desk when a chat starts, and {@link ServiceDesk.sendMessageToAgent | sendMessageToAgent} sends a message from the user to an agent.

Carbon AI Chat also provides a callback API so the service desk can talk back. For example, {@link ServiceDeskCallback.agentJoined | agentJoined} tells Carbon AI Chat when an agent joins the chat, and {@link ServiceDeskCallback.sendMessageToUser | sendMessageToUser} shows the user a message from the agent.

### Communicating from the Carbon AI Chat to your service desk

The `serviceDeskFactory` config property expects a factory function that returns an object of functions or a class and receives {@link ServiceDeskFactoryParameters}. Carbon AI Chat calls the returned class or functions as needed to communicate with your integration.

### Communicating from your service desk to the Carbon AI Chat

The factory receives a callback object in {@link ServiceDeskFactoryParameters}. These callbacks are the functions you call inside your service desk code to communicate information back to the Carbon AI Chat.

### Interaction flow

These steps happen when a user connects to a service desk, and they show how Carbon AI Chat interacts with the service desk integration.

1. When Carbon AI Chat starts, it creates a single instance of the service desk integration through the `serviceDeskFactory` prop.
2. A user sends a message to the assistant. The assistant returns a "Connect to Agent" response (response_type="connect_to_agent").
3. If the integration implements it, Carbon AI Chat calls {@link ServiceDesk.areAnyAgentsOnline | areAnyAgentsOnline} to check whether any agents are online. The result decides whether Carbon AI Chat shows a "request agent" button or the "no agents available" message.
4. User clicks the "request agent" button.
5. Carbon AI Chat calls {@link ServiceDesk.startChat | startChat} on the integration. The integration asks the service desk to start a new chat.
6. A banner tells the user that Carbon AI Chat is connecting them to an agent.
7. If the service desk supports it, the integration calls {@link ServiceDeskCallback.updateAgentAvailability | updateAgentAvailability} to update the banner with the wait time.
8. When an agent becomes available, the integration calls {@link ServiceDeskCallback.agentJoined | agentJoined}, and Carbon AI Chat then tells the user that an agent is joining.
9. When an agent sends a message, the integration calls {@link ServiceDeskCallback.sendMessageToUser | sendMessageToUser}.
10. When the user sends a message, Carbon AI Chat calls {@link ServiceDesk.sendMessageToAgent | sendMessageToAgent}.
11. The user ends the chat.
12. Carbon AI Chat calls {@link ServiceDesk.endChat | endChat} on the integration, which tells the service desk that the chat is over.

## API details

Implement these methods from the {@link ServiceDesk} interface in your integration:

- {@link ServiceDesk.getName | getName}
- {@link ServiceDesk.startChat | startChat}
- {@link ServiceDesk.endChat | endChat}
- {@link ServiceDesk.sendMessageToAgent | sendMessageToAgent}
- {@link ServiceDesk.userReadMessages | userReadMessages} (optional)
- {@link ServiceDesk.areAnyAgentsOnline | areAnyAgentsOnline} (optional)

Call these methods on the {@link ServiceDeskCallback} interface from your integration:

- {@link ServiceDeskCallback.agentEndedChat | agentEndedChat}
- {@link ServiceDeskCallback.agentJoined | agentJoined}
- {@link ServiceDeskCallback.agentLeftChat | agentLeftChat}
- {@link ServiceDeskCallback.agentReadMessages | agentReadMessages}
- {@link ServiceDeskCallback.agentTyping | agentTyping}
- {@link ServiceDeskCallback.beginTransferToAnotherAgent | beginTransferToAnotherAgent}
- {@link ServiceDeskCallback.sendMessageToUser | sendMessageToUser}
- {@link ServiceDeskCallback.setErrorStatus | setErrorStatus}
- {@link ServiceDeskCallback.setFileUploadStatus | setFileUploadStatus}
- {@link ServiceDeskCallback.updateAgentAvailability | updateAgentAvailability}
- {@link ServiceDeskCallback.updateCapabilities | updateCapabilities}

## Supported response types

The {@link ServiceDeskCallback.sendMessageToUser | sendMessageToUser} function shows a message to the user. Pass a string to show a basic text response, or pass a {@link MessageResponse} object with one of these {@link MessageResponseTypes}:

- text
- image
- video
- inline_error
- button (the link button type is the only supported type)
- user_defined

> **Note:** Carbon AI Chat supports markdown in text responses.

## File uploads

Users can select local files to upload to an agent. To enable uploads, your integration takes these steps.

### Enable file uploads

First, call {@link ServiceDeskCallback.updateCapabilities | updateCapabilities} to tell Carbon AI Chat that your service desk supports uploads. It can also say whether it supports multiple files and set a filter for the operating system file select dialog. Call this function at any time, even to change the current capabilities. For example, if your service desk blocks uploads until an agent requests them, wait to call this function until the user gets such a message from the agent.

```ts
this.callback.updateCapabilities({
  allowFileUploads: true,
  allowedFileUploadTypes: "image/*,.txt",
  allowMultipleFileUploads: true,
});
```

### Validating files before uploading

When a user selects files to upload, Carbon AI Chat calls {@link ServiceDesk.filesSelectedForUpload | filesSelectedForUpload} in your integration. Use this function to check that the file is fine to upload: check its type or size, and if it isn't valid, report an error by calling {@link ServiceDeskCallback.setFileUploadStatus | setFileUploadStatus}. The user must remove any files in error before they send a message with the files.

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

### Handling uploaded files

After you enable file uploads, the user can select files and send them to an agent as a "message". Carbon AI Chat passes the {@link FileUpload} objects to your integration through {@link ServiceDesk.sendMessageToAgent | sendMessageToAgent}, where they arrive as the `additionalData.filesToUpload` argument.

> **Note:** The user doesn't need to type a message, so the `message.input.text` value can be empty.

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

### Updating file upload status

When your integration finishes a file upload, or when an upload stops because of an error, report the status to the user with {@link ServiceDeskCallback.setFileUploadStatus | setFileUploadStatus}.

```ts
// Called when the service desk has reported an error.
this.callback.setFileUploadStatus(file.id, true, errorMessage);
```

## Screen sharing

You can add screen sharing or co-browse from your service desk. The service desk API lets your integration ask the user to approve the agent's screen sharing request, and it also lets the user stop sharing whenever they want.

> **Note:** Carbon AI Chat doesn't provide the screen sharing functions, only the request for permission from the user. The service desk integration provides the screen sharing capability.

To start a screen sharing session, call {@link ServiceDeskCallback.screenShareRequest | screenShareRequest}. Carbon AI Chat shows a modal that asks the user to approve the screen sharing request. The function returns a Promise that resolves when the user responds, and the resolved value is the user's response.

The integration can stop screen sharing at any point, even while waiting for the user to approve a request. Use that to build a timeout: for example, give the user a limited time to respond before you cancel the request. An appropriate message displays to the user. To end screen sharing, call {@link ServiceDeskCallback.screenShareEnded | screenShareEnded}.

The user can stop screen sharing at any point, and when they do, Carbon AI Chat calls {@link ServiceDesk.screenShareStop | screenShareStop} on your integration.

## Reconnecting sessions

Some service desks let users reconnect to an agent after the page reloads, and Carbon AI Chat supports this. It tracks whether a user connects to an agent between page loads, so if Carbon AI Chat loads and finds the user was connected to an agent before, it gives the integration a chance to reconnect. Carbon AI Chat calls {@link ServiceDesk.reconnect | reconnect} if it exists on the integration, and the service desk then reconnects however it needs to. Once the reconnect finishes or fails, {@link ServiceDesk.reconnect | reconnect} resolves with a boolean that tells Carbon AI Chat whether reconnection succeeded.

> **Note:** The user can't interact with Carbon AI Chat until {@link ServiceDesk.reconnect | reconnect} resolves, or the user chooses to disconnect from the service desk.

If the integration needs to record state between page loads, it can use {@link ServiceDeskCallback.updatePersistedState | updatePersistedState}, which stores the data in the browser's session history, next to the session data Carbon AI Chat stores. Session storage has a size limit, so don't put large amounts of data here.

### Handling service desks that don't support reconnection

Not all service desks can reconnect users to their previous agent conversations after a page refresh. Carbon AI Chat handles these cases gracefully:

**Option 1: Don't implement the {@link ServiceDesk.reconnect | reconnect} method (recommended for unsupported service desks)**

If your service desk doesn't support reconnection, leave the {@link ServiceDesk.reconnect | reconnect} method out of your integration, and Carbon AI Chat then skips any reconnection attempts.

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

**Option 2: Implement {@link ServiceDesk.reconnect | reconnect} and return `false`**

To handle the reconnection attempt yourself, implement the method and return `false`:

```ts
class MyServiceDesk {
  async reconnect() {
    // Your service desk doesn't support reconnection
    return false; // This ends the chat gracefully
  }
}
```

**Option 3: Disable reconnection through config**

You can also turn off reconnection attempts entirely through config:

```tsx
<ChatContainer
  serviceDeskFactory={myFactory}
  serviceDesk={{ allowReconnect: false }}
/>
```

### What happens when reconnection fails or isn't supported

When reconnection isn't possible, Carbon AI Chat does the following:

1. **Connection state is cleared**: Carbon AI Chat ends the chat session.
2. **User notification**: The user sees the message "You disconnected from the live agent."
3. **Assistant continues**: After a brief delay, the conversation continues with the assistant.
4. **Fresh start**: The user can start a new agent conversation if needed.

The user can then start a new agent conversation.

## Related

- [Message format](./MessageFormat.md) — the {@link MessageResponse} shapes your integration sends to the user.
- [Using with React](./React.md) — set up the container component before wiring `serviceDeskFactory`.
- [Using as a Web component](./WebComponent.md) — set up the web component container before wiring `serviceDeskFactory`.
