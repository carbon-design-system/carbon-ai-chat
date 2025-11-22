/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@testing-library/jest-dom";
import React from "react";
import { loadAllLazyDeps } from "@carbon/ai-chat/server";
import { vi } from "vitest";

// Preload every lazily imported dependency (CodeMirror, DataTable, Swiper,
// react-player, Day.js locales, etc.) once before the suite runs. That keeps
// the component code from issuing dynamic import() calls halfway through a
// test, which would otherwise stall happy-dom while the modules resolve.
beforeAll(async () => {
  await loadAllLazyDeps();
});

/**
 * react-player attempts to load remote SDK scripts (YouTube/Vimeo) as soon as
 * the component mounts. That fails under happy-dom because script loading is
 * disabled. We stub the player once here so tests can still exercise the media
 * response types without hitting the network or throwing DOMException errors.
 */
vi.mock("react-player/lazy/index.js", () => {
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

/**
 * CodeMirror deeply depends on browser layout/focus APIs that happy-dom
 * doesn't implement (ShadowRoot.activeElement, layout measurements, etc.).
 * Rather than polyfilling everything, we stub EditorView so tests can still
 * verify the markup around the snippet without CodeMirror blowing up. Skip
 * this mock as well if your tests avoid rendering code responses.
 */
vi.mock("@codemirror/view", async () => {
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

/**
 * Mock the CodeMirror runtime loader so components never touch the real editor stack
 * (which depends on complex browser APIs that aren't available under happy-dom). Skip
 * this mock as well if your tests avoid rendering code responses.
 */
vi.mock(
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
  (window as any).ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
});
