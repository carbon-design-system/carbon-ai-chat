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

| Symbol | Kind | Role in this example |
| --- | --- | --- |
| `<cds-aichat-custom-element>` | Chat host | Mounts the full-screen chat. |
| `slot="customPromptLine"` | Slot | Replaces the built-in composer while it has content. |
| `<cds-aichat-prompt-line-shell>` | Custom element | Lays out the editor and send control. |
| `<cds-aichat-prompt-line>` | Custom element | Edits the host draft and emits send intent. |
| `<cds-aichat-input-send-control>` | Custom element | Sends the draft when enabled. |
| `onAfterRender` | Callback | Gets the instance and subscribes to state. |
| `instance.send` | Instance method | Sends the host draft. |
| `instance.messaging.addMessage` | Instance method | Adds the mock reply. |
| `instance.getState` | Instance method | Reads public loading and upload state. |
| `instance.on` / `instance.off` | Instance methods | Manage the state subscription. |
| `BusEventType.STATE_CHANGE` | Event | Updates send availability. |
| `messaging.customSendMessage` | Config | Runs the local mock transport. |
| `layout.showFrame` / `openChatByDefault` | Config | Opens the chat without its floating frame. |

The input components handle text editing and keyboard behavior. The host owns labels, send handling, errors, limits, busy state, and uploads. This text-only example does not add uploads. Host uploads do not use the built-in queue or its public in-flight flag.

Public state does not expose all built-in lockouts or a stop-streaming control. This example blocks sends during a human-agent session; it does not add service-desk routing. Send `fail` to try an error, then edit your draft and retry.

The `customPromptLine` slot enables the custom prompt line directly in the template. Removing its content restores the built-in draft. This example keeps the custom draft in host state while the built-in composer is shown.

## Run it

**Build the core packages first.** Examples use their built output.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat
npm run start --workspace=@carbon/ai-chat-examples-web-components-custom-prompt-line
```

See [../README.md](../README.md) for the full setup walkthrough.
