import "@testing-library/jest-dom";

beforeEach(() => {
  // Mock ResizeObserver which is used by Carbon components
  (window as any).ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
});
