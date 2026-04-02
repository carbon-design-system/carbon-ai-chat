import "@testing-library/jest-dom";
import { loadAllLazyDeps } from "@carbon/ai-chat/server";

// Preload every lazily imported dependency (CodeMirror, DataTable, Swiper,
// Day.js locales, etc.) once before the suite runs. That keeps
// the component code from issuing dynamic import() calls halfway through a
// test, which would otherwise stall happy-dom while the modules resolve.
beforeAll(async () => {
  await loadAllLazyDeps();
});

/**
 * CodeMirror deeply depends on browser layout/focus APIs that happy-dom
 * doesn't implement (ShadowRoot.activeElement, layout measurements, etc.).
 * Rather than polyfilling everything, we stub EditorView so tests can still
 * verify the markup around the snippet without CodeMirror blowing up. Skip
 * this mock as well if your tests avoid rendering code responses.
 */
jest.mock("@codemirror/view", () => {
  const actual = jest.requireActual("@codemirror/view");

  class MockEditorView {
    dom: unknown;
    state: { doc: { lines: number } };
    constructor() {
      this.dom = {};
      this.state = { doc: { lines: 0 } };
    }
    destroy() {}
    dispatch() {}
  }

  return {
    ...actual,
    EditorView: MockEditorView,
  };
});

/**
 * Mock the CodeMirror runtime loader so components never touch the real editor stack
 * (which depends on complex browser APIs that aren't available under happy-dom).
 */
jest.mock(
  "@carbon/ai-chat-components/es/components/code-snippet/src/codemirror/codemirror-loader.js",
  () => {
    const createRuntime = async () => {
      class MockCompartment {}
      class MockLanguageController {
        constructor() {}
        async resolveLanguageSupport() {
          return null;
        }
        async handleStreamingLanguageDetection() {}
        detectLanguageForEditable() {}
        reset() {}
        dispose() {}
      }
      return {
        Compartment: MockCompartment,
        LanguageController: MockLanguageController,
        createContentSync: () => ({
          update() {},
          cancel() {},
        }),
        applyLanguageSupport() {},
        updateReadOnlyConfiguration() {},
        createEditorView: ({ doc = "" }) => {
          const lines =
            typeof doc === "string" ? doc.split(/\r\n|\r|\n/).length : 0;
          return {
            state: { doc: { lines } },
            destroy() {},
            dispatch() {},
          };
        },
      };
    };

    return {
      loadCodeMirrorRuntime: () => createRuntime(),
      loadCodeSnippetDeps: () => createRuntime(),
    };
  },
);

beforeEach(() => {
  // Mock ResizeObserver which is used by Carbon components
  (window as any).ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
});
