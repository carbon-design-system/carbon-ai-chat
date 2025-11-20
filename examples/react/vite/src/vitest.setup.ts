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

beforeAll(async () => {
  await loadAllLazyDeps();
});

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
  }

  return {
    ...actual,
    EditorView: MockEditorView,
  };
});

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
  (window as any).ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
});
