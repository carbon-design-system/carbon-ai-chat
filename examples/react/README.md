# React examples

This folder contains examples for specific functionality in React.

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

Then start any React example directly from the root:

```bash
npm run start --workspace=<workspace-name>
```

| Example                                                                              | Description                                                                                                                                                 | Start/Test command                                                                                                             |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [Basic](./basic/README.md)                                                           | Example showing sending and receiving a message from a mock server.                                                                                         | `npm run start --workspace=@carbon/ai-chat-examples-react-basic`                                                               |
| [Custom Element](./custom-element/README.md)                                         | Example using ChatCustomElement for full-screen custom element integration.                                                                                 | `npm run start --workspace=@carbon/ai-chat-examples-react-custom-element`                                                      |
| [Custom Element Lazy Load](./custom-element-lazy-load/README.md)                     | Example using React.lazy to code-split ChatCustomElement with a seamless ChatShell crossfade fallback.                                                      | `npm run start --workspace=@carbon/ai-chat-examples-react-custom-element-lazy-load`                                            |
| [Custom Element as Float](./custom-element-as-float/README.md)                       | Example using ChatCustomElement with float layout classes and a custom icon launcher to replicate the built-in float view from ChatContainer.               | `npm run start --workspace=@carbon/ai-chat-examples-react-custom-element-as-float`                                             |
| [Custom Element as Float (Lazy Load)](./custom-element-as-float-lazy-load/README.md) | Example using React.lazy to code-split ChatCustomElement as a floating widget, with a custom icon launcher and float layout classes from `@carbon/ai-chat`. | `npm run start --workspace=@carbon/ai-chat-examples-react-custom-element-as-float-lazy-load`                                   |
| [History](./history/README.md)                                                       | Example showing message history loading with customLoadHistory.                                                                                             | `npm run start --workspace=@carbon/ai-chat-examples-react-history`                                                             |
| [Chat History (Float)](./chat-history-float/README.md)                               | `ChatContainer` with the history feature enabled and a custom `historyPanelElement` slot for browsing saved conversations in the float layout.              | `npm run start --workspace=@carbon/ai-chat-examples-react-chat-history-float`                                                  |
| [Chat History (Fullscreen)](./chat-history-fullscreen/README.md)                     | `ChatCustomElement` fullscreen host with the history feature enabled and a custom `historyPanelElement` for browsing conversations.                         | `npm run start --workspace=@carbon/ai-chat-examples-react-chat-history-fullscreen`                                             |
| [Human Agent](./human-agent/README.md)                                               | Demonstrates a human agent service desk via `serviceDeskFactory` with custom send message behavior.                                                         | `npm run start --workspace=@carbon/ai-chat-examples-react-human-agent`                                                         |
| [File Upload](./file-upload/README.md)                                               | Example demonstrating file attachments using a mock `onFileUpload` handler that simulates a server upload and echoes back file metadata.                    | `npm run start --workspace=@carbon/ai-chat-examples-react-file-upload`                                                         |
| [Reasoning & Chain of Thought](./reasoning-and-chain-of-thought/README.md)           | Mocked reasoning steps and chain-of-thought flows (streamed, controlled, and default behaviors).                                                            | `npm run start --workspace=@carbon/ai-chat-examples-react-reasoning-and-chain-of-thought`                                      |
| [Workspace](./workspace/README.md)                                                   | Example demonstrating the workspace feature for displaying custom content alongside chat.                                                                   | `npm run start --workspace=@carbon/ai-chat-examples-react-workspace`                                                           |
| [Workspace Sidebar](./workspace-sidebar/README.md)                                   | Example demonstrating the workspace feature with sidebar layout for custom content.                                                                         | `npm run start --workspace=@carbon/ai-chat-examples-react-workspace-sidebar`                                                   |
| [watsonx.ai](./watsonx/README.md)                                                    | Example showing sending and receiving a message from watsonx.ai.                                                                                            | `npm run start --workspace=@carbon/ai-chat-examples-react-watsonx`                                                             |
| [Watch state](./watch-state/README.md)                                               | Example monitoring chat state changes.                                                                                                                      | `npm run start --workspace=@carbon/ai-chat-examples-react-watch-state`                                                         |
| [Vite](./vite/README.md)                                                             | Vite-based React example that mirrors the basic mock backend while also demonstrating the Vitest suite.                                                     | `npm run dev --workspace=@carbon/ai-chat-examples-react-vite` / `npm run test --workspace=@carbon/ai-chat-examples-react-vite` |
| [Next.js](./next/README.md)                                                          | Next.js App Router example embedding the same mocked chat experience for SSR/edge-friendly setups.                                                          | `npm run dev --workspace=@carbon/ai-chat-examples-react-next`                                                                  |
| [React 17](./react-17/README.md)                                                     | Runs `ChatContainer` on React 17 via the legacy `ReactDOM.render` root to verify pre-concurrent API compatibility.                                          | `npm run start --workspace=@carbon/ai-chat-examples-react-react-17`                                                            |
| [Jest (happy-dom)](./jest-happydom/README.md)                                        | Demonstrates how to exercise ChatContainer end to end inside Jest using the happy-dom environment.                                                          | `npm run test --workspace=@carbon/ai-chat-examples-react-jest-happydom`                                                        |
| [Jest (jsdom)](./jest-jsdom/README.md)                                               | Baseline Jest + jsdom example for simpler DOM driven tests.                                                                                                 | `npm run test --workspace=@carbon/ai-chat-examples-react-jest-jsdom`                                                           |
| [CSP](./csp/README.md)                                                               | Example demonstrating usage with the strictest possible Content Security Policy (CSP).                                                                      | `npm run start --workspace=@carbon/ai-chat-examples-react-csp`                                                                 |
