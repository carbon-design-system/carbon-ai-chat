# Custom prompt line

Replace the built-in prompt line with input components from `@carbon/ai-chat-components` and send text through the public API.

## What this example shows

- Compose the prompt line shell, editor, and send control.
- Send text with a structured field, show busy and error states, and keep the draft after a failed send.
- Switch to the built-in composer and restore its saved draft.
- Use public loading, upload, and human-agent state to gate assistant sends.

## When to use this pattern

- Your app needs to own the whole composer, its controls, and its draft.
- You send to an assistant and handle any uploads in your own app.

## APIs and props demonstrated

| Symbol | Package / kind | Role in this example |
| --- | --- | --- |
| `ChatCustomElement` | Chat host | Mounts the full-screen chat. |
| `WriteableElementName.CUSTOM_PROMPT_LINE` | Slot | Replaces the built-in composer while it has content. |
| `PromptLineShell` / `PromptLine` / `InputSendControl` | `@carbon/ai-chat-components` components | Render the editor and send control. |
| `renderWriteableElements` | Host API | Supplies the custom composer. |
| `onBeforeRender` | Callback | Gets the instance before the first paint. |
| `instance.send` | Instance method | Sends the host draft. |
| `instance.messaging.addMessage` | Instance method | Adds the mock reply. |
| `instance.getState` | Instance method | Reads public loading and upload state. |
| `instance.on` / `instance.off` | Instance methods | Manage the state subscription. |
| `BusEventType.STATE_CHANGE` | Event | Updates send availability. |
| `messaging.customSendMessage` | Config | Runs the local mock transport. |
| `layout.showFrame` / `openChatByDefault` | Config | Opens the chat without its floating frame. |

The input components handle text editing and keyboard behavior. The host owns labels, send handling, errors, limits, busy state, and uploads. This text-only example does not add uploads. Host uploads do not use the built-in queue or its public in-flight flag.

Public state does not expose all built-in lockouts or a stop-streaming control. This example blocks sends during a human-agent session; it does not add service-desk routing. Send `fail` to try an error, then edit your draft and retry.

Content enables the custom prompt line. You can add it after startup; `onBeforeRender` only controls timing. Removing it restores the built-in draft. The host owns whether to retain its own draft after removal.

## Run it

**Build the core packages first.** Examples use their built output.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat
npm run start --workspace=@carbon/ai-chat-examples-react-custom-prompt-line
```

See [../README.md](../README.md) for the full setup walkthrough.
