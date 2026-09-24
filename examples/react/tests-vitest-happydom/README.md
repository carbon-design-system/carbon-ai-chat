# Tests / Vitest (happy-dom)

Tests `ChatContainer` with Vitest and happy-dom, covering chat mounting, launcher clicks, shadow DOM queries, and slotted React content.

## What this example shows

- Running React component tests with Vitest and happy-dom.
- Waiting for the chat to render, opening it with the launcher, and finding controls inside its shadow DOM.
- Checking custom header content passed through `renderWriteableElements`.
- Loading lazy dependencies, mocking browser APIs, and removing changing Lit markers from snapshots in `vitest.setup.ts`.

## When to use this pattern

- You use Vitest and need to test the chat's custom elements and shadow DOM.
- You want a starting point for DOM mocks and stable component snapshots.

## APIs and props demonstrated

| Symbol | Package / kind | Role in this example |
| --- | --- | --- |
| `ChatContainer` | `@carbon/ai-chat` component | Mounts the chat under test. |
| `PublicConfig` | `@carbon/ai-chat` type | Types the app's chat config. |
| `messaging.customSendMessage` | Config prop | Supplies mock responses without a backend. |
| `ChatInstance.messaging.addMessage` | Instance method | Adds text responses to the chat. |
| `MessageResponseTypes.TEXT` | Response type | Marks a mock response as text. |
| `renderWriteableElements.headerBottomElement` | Component prop | Inserts React content into the header slot. |
| `data-testid` | Component prop | Gives the mounted chat a test selector. |
| `PageObjectId` | `@carbon/ai-chat` enum | Identifies the launcher, main panel, input, and send button. |
| `deepQuerySelector` | `@carbon/ai-chat-components` utility | Finds controls across nested shadow roots. |
| `loadAllLazyDeps` | `@carbon/ai-chat/server` utility | Loads deferred modules before tests run. |
| `render`, `act`, `waitFor`, `cleanup` | `@testing-library/react` utilities | Mount components, wait for updates, and clean up each test. |
| `vi.mock`, `expect.addSnapshotSerializer` | Vitest utilities | Stub browser dependencies and normalize snapshots. |
| `happy-dom` | Test environment | Provides DOM APIs for the Vitest suite. |

## Run it

**Build the core packages first.** The tests load the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`. Rebuild those packages after changing their source.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run test --workspace=@carbon/ai-chat-examples-react-tests-vitest-happydom
```

Use `test:watch` to rerun tests as files change. To open the app in a browser, run:

```bash
npm run start --workspace=@carbon/ai-chat-examples-react-tests-vitest-happydom
```

The app also supports `build` and `preview`.

See [../README.md](../README.md) for the full setup walkthrough.
