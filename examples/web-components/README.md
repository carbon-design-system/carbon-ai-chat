# Web component examples

This folder contains examples for specific functionality using web components with Lit.

## Run Examples from the Monorepo Root

Install dependencies once from the repository root:

```bash
npm install
```

Then build the required packages (needed once after install, and again after any local changes to `packages/`):

```bash
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat
```

Then start any web components example directly from the root:

```bash
npm run start --workspace=<workspace-name>
```

| Example                                                                              | Description                                                                                                                                    | Start command                                                                                         |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| [Basic](./basic/README.md)                                                           | Example showing sending and receiving a message from a mock server.                                                                            | `npm run start --workspace=@carbon/ai-chat-examples-web-components-basic`                             |
| [Custom Element](./custom-element/README.md)                                         | Example using cds-aichat-custom-element for full-screen custom element integration.                                                            | `npm run start --workspace=@carbon/ai-chat-examples-web-components-custom-element`                    |
| [Custom Element Lazy Load](./custom-element-lazy-load/README.md)                     | Example using dynamic import to lazy-load cds-aichat-custom-element, with cds-aichat-shell as a seamless crossfade fallback.                   | `npm run start --workspace=@carbon/ai-chat-examples-web-components-custom-element-lazy-load`          |
| [Custom Element as Float](./custom-element-as-float/README.md)                       | Example using cds-aichat-custom-element with float layout classes and a custom icon launcher to replicate the built-in float view.             | `npm run start --workspace=@carbon/ai-chat-examples-web-components-custom-element-as-float`           |
| [Custom Element as Float (Lazy Load)](./custom-element-as-float-lazy-load/README.md) | Example using dynamic import to lazy-load cds-aichat-custom-element as a floating widget, with a cds-aichat-shell overlay and custom launcher. | `npm run start --workspace=@carbon/ai-chat-examples-web-components-custom-element-as-float-lazy-load` |
| [History](./history/README.md)                                                       | Example showing message history loading with customLoadHistory.                                                                                | `npm run start --workspace=@carbon/ai-chat-examples-web-components-history`                           |
| [Chat History (Float)](./chat-history-float/README.md)                               | Float-layout chat with a custom history panel slot backed by `customLoadHistory`, for switching between saved conversations.                   | `npm run start --workspace=@carbon/ai-chat-examples-web-components-chat-history-float`                |
| [Chat History (Fullscreen)](./chat-history-fullscreen/README.md)                     | Fullscreen `<cds-aichat-custom-element>` with a custom history panel slot backed by `customLoadHistory`.                                       | `npm run start --workspace=@carbon/ai-chat-examples-web-components-chat-history-fullscreen`           |
| [Human Agent](./human-agent/README.md)                                               | Demonstrates a human agent service desk via `serviceDeskFactory` with custom send message logic.                                               | `npm run start --workspace=@carbon/ai-chat-examples-web-components-human-agent`                       |
| [File Upload](./file-upload/README.md)                                               | Example demonstrating file attachments using a mock `onFileUpload` handler that simulates a server upload and echoes back file metadata.       | `npm run start --workspace=@carbon/ai-chat-examples-web-components-file-upload`                       |
| [Reasoning & Chain of Thought](./reasoning-and-chain-of-thought/README.md)           | Mocked reasoning steps and chain-of-thought flows (streamed, controlled, and default behaviors).                                               | `npm run start --workspace=@carbon/ai-chat-examples-web-components-reasoning-and-chain-of-thought`    |
| [Workspace](./workspace/README.md)                                                   | Example demonstrating the workspace feature for displaying custom content alongside chat.                                                      | `npm run start --workspace=@carbon/ai-chat-examples-web-components-workspace`                         |
| [Workspace Sidebar](./workspace-sidebar/README.md)                                   | Example demonstrating the workspace feature with sidebar layout for custom content.                                                            | `npm run start --workspace=@carbon/ai-chat-examples-web-components-workspace-sidebar`                 |
| [watsonx.ai](./watsonx/README.md)                                                    | Example showing sending and receiving a message from watsonx.ai.                                                                               | `npm run start --workspace=@carbon/ai-chat-examples-web-components-watsonx`                           |
| [Watch state](./watch-state/README.md)                                               | Example monitoring chat state changes.                                                                                                         | `npm run start --workspace=@carbon/ai-chat-examples-web-components-watch-state`                       |
| [CSP](./csp/README.md)                                                               | Example demonstrating usage with the strictest possible Content Security Policy (CSP).                                                         | `npm run start --workspace=@carbon/ai-chat-examples-web-components-csp`                               |
