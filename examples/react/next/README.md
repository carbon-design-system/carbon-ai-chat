# React Next.js Example

This example shows how to embed the `ChatContainer` React component from `@carbon/ai-chat` inside a Next.js application. It reuses the same mocked messaging stack that powers `examples/react/basic`, so you can interact with the widget locally without a backend.

## Prerequisites

Install dependencies from the repository root:

```bash
npm install
```

## Commands

Run the dev server:

```bash
npm run dev --workspace=@carbon/ai-chat-examples-react-next
```

Build for production:

```bash
npm run build --workspace=@carbon/ai-chat-examples-react-next
```

Start the production server (after building):

```bash
npm run start --workspace=@carbon/ai-chat-examples-react-next
```

## Notes

- The example uses the App Router (`app/` directory) with a client component that renders `<ChatContainer />`.
- The mocked `customSendMessage` implementation matches the basic example, including streaming behavior and user-defined responses.
- Next.js automatically transpiles the `@carbon/ai-chat` packages, so no custom webpack configuration is required.
