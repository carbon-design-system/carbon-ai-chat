# Web component examples

This folder contains examples for specific functionality using web components with Lit.

## Run Examples from the Monorepo Root

Install dependencies once from the repository root:

```bash
npm install
```

Then start any web components example directly from the root:

```bash
npm run start --workspace=<workspace-name>
```

| Example                                                           | Description                                                                                      | Start command                                                                                      |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| [Basic](./basic/)                                                 | Example showing sending and receiving a message from a mock server.                              | `npm run start --workspace=@carbon/ai-chat-examples-web-components-basic`                          |
| [Custom Element](./custom-element/)                               | Example using cds-aichat-custom-element for full-screen custom element integration.              | `npm run start --workspace=@carbon/ai-chat-examples-web-components-custom-element`                 |
| [History](./history/)                                             | Example showing message history loading with customLoadHistory.                                  | `npm run start --workspace=@carbon/ai-chat-examples-web-components-history`                        |
| [Human Agent](./human-agent/)                                     | Demonstrates a human agent service desk via `serviceDeskFactory` with custom send message logic. | `npm run start --workspace=@carbon/ai-chat-examples-web-components-human-agent`                    |
| [Reasoning & Chain of Thought](./reasoning-and-chain-of-thought/) | Mocked reasoning steps and chain-of-thought flows (streamed, controlled, and default behaviors). | `npm run start --workspace=@carbon/ai-chat-examples-web-components-reasoning-and-chain-of-thought` |
| [Workspace](./workspace/)                                         | Example demonstrating the workspace feature for displaying custom content alongside chat.        | `npm run start --workspace=@carbon/ai-chat-examples-web-components-workspace`                      |
| [Workspace Sidebar](./workspace-sidebar/)                         | Example demonstrating the workspace feature with sidebar layout for custom content.              | `npm run start --workspace=@carbon/ai-chat-examples-web-components-workspace-sidebar`              |
| [watsonx.ai](./watsonx/)                                          | Example showing sending and receiving a message from watsonx.ai.                                 | `npm run start --workspace=@carbon/ai-chat-examples-web-components-watsonx`                        |
| [Watch state](./watch-state/)                                     | Example monitoring chat state changes.                                                           | `npm run start --workspace=@carbon/ai-chat-examples-web-components-watch-state`                    |
| [CSP](./csp/)                                                     | Example demonstrating usage with the strictest possible Content Security Policy (CSP).           | `npm run start --workspace=@carbon/ai-chat-examples-web-components-csp`                            |
