/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Title: Jest setup wired for the happy-dom test environment.
 *
 * Demonstrates: what the runner needs to make @carbon/ai-chat behave under
 * happy-dom -- preloading lazy chunks, stubbing the CodeMirror runtime, and
 * patching ResizeObserver -- so suites can focus on assertions instead of
 * environment plumbing.
 *
 * APIs exercised: loadAllLazyDeps, jest.mock, beforeAll / beforeEach,
 * `@testing-library/jest-dom` matchers, ResizeObserver shim.
 *
 * Why happy-dom (vs jsdom): happy-dom implements custom elements and shadow
 * DOM faithfully enough that Lit components actually upgrade and render,
 * which is what makes PageObjectId-based shadow-DOM queries work here;
 * jsdom's shadow-DOM support is partial and wouldn't run those paths.
 *
 * Start reading at: the beforeAll that calls loadAllLazyDeps -- that single
 * call is what lets the rest of this file stay short.
 */

import "@testing-library/jest-dom";
import { loadAllLazyDeps } from "@carbon/ai-chat/server";

// preload every lazily imported dependency (CodeMirror, DataTable,
// Day.js locales, etc.) once before the suite. Otherwise a dynamic import()
// triggered mid-test can stall happy-dom while modules resolve and cause
// flaky waitFor timeouts.
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
  // happy-dom doesn't ship a ResizeObserver, but several Carbon
  // components construct one on mount; an inert stub keeps them from
  // throwing without changing render behavior.
  (window as any).ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  // The chat persists viewState (open vs. launcher) into sessionStorage,
  // so a test that opens the chat would leave the next test starting in
  // the open state instead of with the launcher visible. Clear both
  // storages between tests so each spec gets a clean default config.
  window.sessionStorage.clear();
  window.localStorage.clear();
});
