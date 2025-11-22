import "@testing-library/jest-dom";
import { loadAllLazyDeps } from "@carbon/ai-chat/server";

// Preload the shared lazy dependencies so jsdom never has to evaluate dynamic
// import() calls during the tests. Even though jsdom cannot render inside the
// shadow DOM, eager loading keeps the component code paths deterministic.
beforeAll(async () => {
  await loadAllLazyDeps();
});

/**
 * Even though jsdom doesn't render the inside of the shadow DOM, the React
 * media response components still instantiate react-player. We mock the lazy
 * bundle here so it doesn't try to fetch external SDKs (YouTube/Vimeo) during
 * tests. This mirrors the happy-dom setup to keep both examples consistent.
 */
jest.mock("react-player/lazy/index.js", () => {
  const React = jest.requireActual("react");
  const MockPlayer = (props: Record<string, unknown>) =>
    React.createElement(
      "div",
      { "data-testid": "mock-react-player", ...props },
      "Mock React Player",
    );

  return {
    __esModule: true,
    default: MockPlayer,
  };
});

beforeEach(() => {
  // Mock ResizeObserver which is used by Carbon components
  (window as any).ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
});
