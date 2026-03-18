import "@testing-library/jest-dom";
import { loadAllLazyDeps } from "@carbon/ai-chat/server";

// Preload the shared lazy dependencies so jsdom never has to evaluate dynamic
// import() calls during the tests. Even though jsdom cannot render inside the
// shadow DOM, eager loading keeps the component code paths deterministic.
beforeAll(async () => {
  await loadAllLazyDeps();
});

beforeEach(() => {
  // Mock ResizeObserver which is used by Carbon components
  (window as any).ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
});
