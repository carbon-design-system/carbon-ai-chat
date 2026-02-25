# React examples

This folder contains examples for specific functionality in React.

## Run Examples from the Monorepo Root

Install dependencies once from the repository root:

```bash
npm install
```

Then start any React example directly from the root:

```bash
npm run start --workspace=<workspace-name>
```

| Example                                                           | Description                                                                                             | Start/Test command                                                                                                             |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [Basic](./basic/)                                                 | Example showing sending and receiving a message from a mock server.                                     | `npm run start --workspace=@carbon/ai-chat-examples-react-basic`                                                               |
| [Custom Element](./custom-element/)                               | Example using ChatCustomElement for full-screen custom element integration.                             | `npm run start --workspace=@carbon/ai-chat-examples-react-custom-element`                                                      |
| [History](./history/)                                             | Example showing message history loading with customLoadHistory.                                         | `npm run start --workspace=@carbon/ai-chat-examples-react-history`                                                             |
| [Human Agent](./human-agent/)                                     | Demonstrates a human agent service desk via `serviceDeskFactory` with custom send message behavior.     | `npm run start --workspace=@carbon/ai-chat-examples-react-human-agent`                                                         |
| [Reasoning & Chain of Thought](./reasoning-and-chain-of-thought/) | Mocked reasoning steps and chain-of-thought flows (streamed, controlled, and default behaviors).        | `npm run start --workspace=@carbon/ai-chat-examples-react-reasoning-and-chain-of-thought`                                      |
| [Workspace](./workspace/)                                         | Example demonstrating the workspace feature for displaying custom content alongside chat.               | `npm run start --workspace=@carbon/ai-chat-examples-react-workspace`                                                           |
| [Workspace Sidebar](./workspace-sidebar/)                         | Example demonstrating the workspace feature with sidebar layout for custom content.                     | `npm run start --workspace=@carbon/ai-chat-examples-react-workspace-sidebar`                                                   |
| [watsonx.ai](./watsonx/)                                          | Example showing sending and receiving a message from watsonx.ai.                                        | `npm run start --workspace=@carbon/ai-chat-examples-react-watsonx`                                                             |
| [Watch state](./watch-state/)                                     | Example monitoring chat state changes.                                                                  | `npm run start --workspace=@carbon/ai-chat-examples-react-watch-state`                                                         |
| [Vite](./vite/)                                                   | Vite-based React example that mirrors the basic mock backend while also demonstrating the Vitest suite. | `npm run dev --workspace=@carbon/ai-chat-examples-react-vite` / `npm run test --workspace=@carbon/ai-chat-examples-react-vite` |
| [Next.js](./next/)                                                | Next.js App Router example embedding the same mocked chat experience for SSR/edge-friendly setups.      | `npm run dev --workspace=@carbon/ai-chat-examples-react-next`                                                                  |
| [Jest (happy-dom)](./jest-happydom/)                              | Demonstrates how to exercise ChatContainer end to end inside Jest using the happy-dom environment.      | `npm run test --workspace=@carbon/ai-chat-examples-react-jest-happydom`                                                        |
| [Jest (jsdom)](./jest-jsdom/)                                     | Baseline Jest + jsdom example for simpler DOM driven tests.                                             | `npm run test --workspace=@carbon/ai-chat-examples-react-jest-jsdom`                                                           |
| [CSP](./csp/)                                                     | Example demonstrating usage with the strictest possible Content Security Policy (CSP).                  | `npm run start --workspace=@carbon/ai-chat-examples-react-csp`                                                                 |
