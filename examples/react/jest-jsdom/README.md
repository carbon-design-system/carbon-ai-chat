# Jest Testing Example (jsdom)

This example demonstrates how to test `@carbon/ai-chat` React components using Jest, React Testing Library, and **jsdom**.

## Getting Started

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

## Configuration

### Jest Configuration

The Jest configuration ([jest.config.js](jest.config.js)) includes:

- **jsdom environment** for DOM testing
- **Babel transformation** for TypeScript/JSX files
- **CSS module mocking** using identity-obj-proxy
- **Transform patterns** for ES modules (lodash-es, lit libraries, @carbon packages)

### Babel Configuration

The Babel configuration ([babel.config.js](babel.config.js)) uses:

- `@babel/preset-env` targeting the current Node version
- `@babel/preset-react` with automatic JSX runtime
- `@babel/preset-typescript` for TypeScript support

### Test Setup

The test setup file ([src/jest.setup.ts](src/jest.setup.ts)) provides:

- `@testing-library/jest-dom` matchers
- Mocked `ResizeObserver` for browser API compatibility

#### jsdom vs happy-dom: Understanding shadow DOM Support

This example uses **jsdom**, the traditional and most widely-used DOM implementation for Jest testing.

##### Critical Limitation: NO shadow DOM Support

**jsdom does NOT support shadow DOM.** Since `@carbon/ai-chat` components are built with web components that use shadow DOM, you **cannot**:

- ❌ Query elements inside the shadow DOM (e.g., input fields, buttons, panels)
- ❌ Use `PageObjectId` selectors to find elements within the component
- ❌ Test internal component behavior that requires accessing shadow DOM elements
- ❌ Interact with form elements or buttons inside the component

**What you CAN do with jsdom:**

- ✅ Verify the custom element wrapper renders (`<cds-aichat-react>`)
- ✅ Test React component props and configuration
- ✅ Test component mounting and unmounting

##### When to Use jsdom vs happy-dom

**Use [happy-dom](../jest-happydom) if you want to be able to run more detailed tests inside the Carbon AI Chat.**

##### Learn More About happy-dom

For better shadow DOM support, see:

- [happy-dom GitHub](https://github.com/capricorn86/happy-dom) - Modern DOM implementation with shadow DOM support
- [jest-happydom example](../jest-happydom) - This project's happy-dom example with `PageObjectId` usage
