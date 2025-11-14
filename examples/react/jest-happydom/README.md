# Jest Testing Example (happy-dom)

This example demonstrates how to test `@carbon/ai-chat` React components using Jest, React Testing Library, and **happy-dom**.

## Why happy-dom instead of jsdom?

This example uses [happy-dom](https://github.com/capricorn86/happy-dom) instead of jsdom because:

- Better support for Web Components and shadow DOM
- More complete and standards-compliant DOM implementation
- Faster performance in many scenarios

## Getting Started

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

## Configuration

### Jest Configuration

The Jest configuration ([jest.config.js](jest.config.js)) includes:

- **happy-dom environment** for DOM testing with better Web Components support
- **Babel transformation** for TypeScript/JSX files
- **CSS module mocking** using identity-obj-proxy
- **Transform patterns** for ES modules (lodash-es, lit libraries, @carbon packages)
- **Module resolution** pointing to the root node_modules for workspace packages

### Babel Configuration

The Babel configuration ([babel.config.js](babel.config.js)) uses:

- `@babel/preset-env` targeting the current Node version
- `@babel/preset-react` with automatic JSX runtime
- `@babel/preset-typescript` for (optional) TypeScript support

### Test Setup

The test setup file ([src/jest.setup.ts](src/jest.setup.ts)) provides:

- `@testing-library/jest-dom` matchers
- Mocked `ResizeObserver` for browser API compatibility
- A call to `loadAllLazyDeps()` from `@carbon/ai-chat/server` so every lazily
  imported dependency (CodeMirror, Carbon DataTable, Swiper, react-player,
  Day.js locales, etc.) is eagerly loaded once before the Jest suite runs.
  This avoids waiting on dynamic `import()` during assertions, which is
  especially important when running in a lightweight DOM environment.

## Testing Lit Components with happy-dom

Since `@carbon/ai-chat` uses Lit web components, you need to handle Lit's asynchronous rendering in your tests.

### Waiting for Lit Updates

Lit components render asynchronously and expose an `updateComplete` promise that resolves when rendering is finished. You should await this promise after any action that triggers a re-render:

```typescript
const customElement = container.querySelector("cds-aichat-react");

// Wait for initial render
if (typeof (customElement as any).updateComplete !== "undefined") {
  await (customElement as any).updateComplete;
}

// After triggering changes (like clicking a button)
launcher.click();
await (customElement as any).updateComplete;

// Now safe to query for newly rendered elements
const mainPanel = shadowRoot.querySelector('[data-testid="main_panel"]');
```

**Why this is needed:**

- Lit batches DOM updates for performance
- Without waiting, your test might query for elements before they're rendered
- The `updateComplete` promise ensures the shadow DOM is fully updated

## Covering Lazy Components and Media

The main test suite (`src/__tests__/ChatContainer.test.tsx`) demonstrates how
to exercise the heaviest response types so you can validate their integrations:

- **Markdown tables + code snippets** – ensures the markdown renderer upgrades
  tables to `<cds-aichat-table>` (Carbon DataTable runtime) and code blocks to
  `<cds-aichat-code-snippet>` (CodeMirror runtime).
- **Conversational search citations** – opens the citations toggle, waits for
  the Swiper carousel to render, and verifies citation cards/search results.
- **Video responses** – renders multiple `MessageResponseTypes.VIDEO` items and
  waits for `.cds-aichat--media-player` instances backed by `react-player`.

Pairing these tests with the custom `transformIgnorePatterns` + `loadAllLazyDeps`
setup is the recommended way to catch regressions whenever downstream packages
change their module formats or add new lazy imports. If you add your own lazy
components, simply extend the setup file (to preload them) and the tests (to
assert they render correctly).
