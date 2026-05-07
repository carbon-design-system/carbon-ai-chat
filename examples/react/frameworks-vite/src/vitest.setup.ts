/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Vitest global setup for the Vite example.
 *
 * Verifies: the toolchain glue needed to run `@carbon/ai-chat` under
 * Vitest with happy-dom — a snapshot serializer that strips dynamic Lit
 * markers, lazy-dep preloading, CodeMirror stubs, and a `ResizeObserver`
 * shim. Loaded automatically via `vite.config.ts` `setupFiles`.
 *
 * Start reading at: `expect.addSnapshotSerializer` below, then follow the
 * `vi.mock` calls in order.
 */

import "@testing-library/jest-dom";
import { loadAllLazyDeps } from "@carbon/ai-chat/server";
import { vi, expect } from "vitest";
import { shadowDomSerializer } from "./__tests__/snapshot-serializer";

// Lit and Carbon emit non-deterministic markers (lit$<id>, UUID-based
// SVG ids) every render — the custom serializer normalizes them so snapshot
// diffs stay meaningful across runs.
expect.addSnapshotSerializer(shadowDomSerializer);

// preloading lazily-imported dependencies (CodeMirror, DataTable,
// Day.js locales, etc.) up front keeps mid-test dynamic `import()` calls
// from stalling happy-dom while the modules resolve.
beforeAll(async () => {
  await loadAllLazyDeps();
});

vi.mock("@codemirror/view", async () => {
  // CodeMirror touches browser layout/focus APIs (ShadowRoot.activeElement,
  // layout measurements) that happy-dom does not implement; stubbing
  // `EditorView` lets tests assert the markup around code responses without
  // polyfilling the entire editor.
  const actual =
    await vi.importActual<typeof import("@codemirror/view")>(
      "@codemirror/view",
    );

  class MockEditorView {
    dom: unknown;
    state: { doc: { lines: number } };
    constructor() {
      this.dom = {};
      this.state = { doc: { lines: 0 } };
    }
    destroy() {}
    dispatch() {}
    static domEventHandlers() {
      return [];
    }
  }

  return {
    ...actual,
    EditorView: MockEditorView,
  };
});

vi.mock(
  "@carbon/ai-chat-components/es/components/code-snippet/src/codemirror/codemirror-loader.js",
  () => {
    // short-circuit the runtime loader so components never reach the real
    // editor stack — happy-dom cannot satisfy its browser-API dependencies and
    // the dynamic loader path would otherwise hang the suite.
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
  // Carbon components subscribe to `ResizeObserver` during mount; happy-dom
  // does not implement it, so a no-op shim prevents `ReferenceError`s.
  (window as any).ResizeObserver = vi.fn(function ResizeObserver() {
    return {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    };
  });
});
