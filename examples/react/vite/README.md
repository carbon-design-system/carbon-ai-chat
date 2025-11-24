# React Vite Example

This example demonstrates how to embed `<ChatContainer />` inside a Vite-powered React app while reusing the same mocked messaging logic that powers `examples/react/basic`.

## Running in development

Install dependencies once from the repository root:

```bash
npm install
```

Start the Vite dev server from the root using the example workspace:

```bash
npm run dev --workspace=@carbon/ai-chat-examples-react-vite
```

This launches Vite on `localhost:5173` by default and renders the floating chat widget.

## Building for production

```bash
npm run build --workspace=@carbon/ai-chat-examples-react-vite
```

## Tests

```bash
npm run test --workspace=@carbon/ai-chat-examples-react-vite
```

This runs the Vitest suite powered by `happy-dom`, which mirrors the Jest/happy-dom tests found in `examples/react/jest-happydom`.

```bash
npm run test:watch --workspace=@carbon/ai-chat-examples-react-vite
```

Starts Vitest in watch mode for local experimentation.
