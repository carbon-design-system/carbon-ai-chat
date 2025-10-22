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

| Example                             | Description                                                                 | Start command                                                             |
| ----------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [Basic](./basic/)                   | Example showing sending and receiving a message from a mock server.         | `npm run start --workspace=@carbon/ai-chat-examples-react-basic`          |
| [Custom Element](./custom-element/) | Example using ChatCustomElement for full-screen custom element integration. | `npm run start --workspace=@carbon/ai-chat-examples-react-custom-element` |
| [History](./history/)               | Example showing message history loading with customLoadHistory.             | `npm run start --workspace=@carbon/ai-chat-examples-react-history`        |
| [watsonx.ai](./watsonx/)            | Example showing sending and receiving a message from watsonx.ai.            | `npm run start --workspace=@carbon/ai-chat-examples-react-watsonx`        |
| [Watch state](./watch-state/)       | Example monitoring chat state changes.                                      | `npm run start --workspace=@carbon/ai-chat-examples-react-watch-state`    |
