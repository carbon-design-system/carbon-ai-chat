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

| Example                                                                       | Description                                                                                                                                    | Start command                                                                                           |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [Basic](./basic/)                                                             | Example showing sending and receiving a message from a mock server.                                                                            | `npm run start --workspace=@carbon/ai-chat-examples-web-components-basic`                               |
| [Custom Element](./custom-element/)                                           | Example using cds-aichat-custom-element for full-screen custom element integration.                                                            | `npm run start --workspace=@carbon/ai-chat-examples-web-components-custom-element`                      |
| [Custom Element Lazy Load](./custom-element-lazy-load/)                       | Example using dynamic import to lazy-load cds-aichat-custom-element, with cds-aichat-shell as a seamless crossfade fallback.                   | `npm run start --workspace=@carbon/ai-chat-examples-web-components-custom-element-lazy-load`            |
| [Custom Element as Float](./custom-element-as-float/)                         | Example using cds-aichat-custom-element with float layout classes and a custom icon launcher to replicate the built-in float view.             | `npm run start --workspace=@carbon/ai-chat-examples-web-components-custom-element-as-float`             |
| [Custom Element as Float (Lazy Load)](./custom-element-as-float-lazy-load/)   | Example using dynamic import to lazy-load cds-aichat-custom-element as a floating widget, with a cds-aichat-shell overlay and custom launcher. | `npm run start --workspace=@carbon/ai-chat-examples-web-components-custom-element-as-float-lazy-load`   |
| [History](./history/)                                                         | Example showing message history loading with customLoadHistory.                                                                                | `npm run start --workspace=@carbon/ai-chat-examples-web-components-history`                             |
| [Human Agent](./human-agent/)                                                 | Demonstrates a human agent service desk via `serviceDeskFactory` with custom send message logic.                                               | `npm run start --workspace=@carbon/ai-chat-examples-web-components-human-agent`                         |
| [File Upload](./file-upload/)                                                 | Example demonstrating file attachments using a mock `onFileUpload` handler that simulates a server upload and echoes back file metadata.       | `npm run start --workspace=@carbon/ai-chat-examples-web-components-file-upload`                         |
| [Mentions & Commands](./mentions-and-commands/)                               | Demonstrates `@mentions` and `/commands` with structured data integration via `onSelect` and `updateStructuredData`.                           | `npm run start --workspace=@carbon/ai-chat-examples-web-components-mentions-and-commands`               |
| [Mentions & Commands (Custom Render)](./mentions-and-commands-custom-render/) | Demonstrates custom token rendering for `@mentions` using Carbon Tag + Tooltip, with default chips for `/commands`.                            | `npm run start --workspace=@carbon/ai-chat-examples-web-components-mentions-and-commands-custom-render` |
| [Typeahead](./typeahead/)                                                     | Demonstrates typeahead/autocomplete suggestions that appear as the user types.                                                                 | `npm run start --workspace=@carbon/ai-chat-examples-web-components-typeahead`                           |
| [Typeahead (Custom List)](./typeahead-custom/)                                | Demonstrates a custom autocomplete list component via `renderCustomList`, replacing the built-in dropdown.                                     | `npm run start --workspace=@carbon/ai-chat-examples-web-components-typeahead-custom`                    |
| [Reasoning & Chain of Thought](./reasoning-and-chain-of-thought/)             | Mocked reasoning steps and chain-of-thought flows (streamed, controlled, and default behaviors).                                               | `npm run start --workspace=@carbon/ai-chat-examples-web-components-reasoning-and-chain-of-thought`      |
| [Workspace](./workspace/)                                                     | Example demonstrating the workspace feature for displaying custom content alongside chat.                                                      | `npm run start --workspace=@carbon/ai-chat-examples-web-components-workspace`                           |
| [Workspace Sidebar](./workspace-sidebar/)                                     | Example demonstrating the workspace feature with sidebar layout for custom content.                                                            | `npm run start --workspace=@carbon/ai-chat-examples-web-components-workspace-sidebar`                   |
| [watsonx.ai](./watsonx/)                                                      | Example showing sending and receiving a message from watsonx.ai.                                                                               | `npm run start --workspace=@carbon/ai-chat-examples-web-components-watsonx`                             |
| [Watch state](./watch-state/)                                                 | Example monitoring chat state changes.                                                                                                         | `npm run start --workspace=@carbon/ai-chat-examples-web-components-watch-state`                         |
| [CSP](./csp/)                                                                 | Example demonstrating usage with the strictest possible Content Security Policy (CSP).                                                         | `npm run start --workspace=@carbon/ai-chat-examples-web-components-csp`                                 |
