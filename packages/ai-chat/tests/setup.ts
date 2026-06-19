/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "jest-environment-jsdom";
import "@testing-library/jest-dom";

// Set to true to enable console output during tests for debugging
const ENABLE_CONSOLE_LOGGING = false;

// Mock Symbol.for for Lit's use of symbols and ensure all needed symbols exist
global.Symbol.for = global.Symbol.for || ((key: string) => Symbol(key));

// Mock specific symbols that Lit uses
(globalThis as any).trustedTypes = null;
(globalThis as any).document = global.document;

// Mock CSS template literal functions
(global as any).__CSS_TAG_SYMBOL__ = Symbol("css-tag");

// Mock CSS functions that might not be available in test environment
if (!global.CSSStyleSheet) {
  (global as any).CSSStyleSheet = class {
    replaceSync() {}
    insertRule() {
      return 0;
    }
    deleteRule() {}
  };
}

// Mock window.matchMedia since it's not available in jsdom
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null as any,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock document.execCommand since it's not available in jsdom but is used
// internally by ProseMirror (e.g. safariShadowSelectionRange)
if (!document.execCommand) {
  document.execCommand = jest.fn().mockReturnValue(false);
}

// Mock elementFromPoint since it's not available in jsdom but is used
// internally by ProseMirror/Tiptap (posAtCoords -> root.elementFromPoint).
// Tiptap's placeholder extension viewport tracking (@tiptap/extensions >= 3.27)
// calls this on editor mount; the editor lives in a shadow root, so patch both
// Document and ShadowRoot. Returning null mirrors the real "no element at point"
// case, which ProseMirror handles gracefully.
if (!Document.prototype.elementFromPoint) {
  Document.prototype.elementFromPoint = jest.fn().mockReturnValue(null);
}
if (
  typeof ShadowRoot !== "undefined" &&
  !ShadowRoot.prototype.elementFromPoint
) {
  (ShadowRoot.prototype as any).elementFromPoint = jest
    .fn()
    .mockReturnValue(null);
}

// Mock ResizeObserver since it's not available in jsdom
(global as any).ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Suppress console output during tests unless debugging
if (!ENABLE_CONSOLE_LOGGING) {
  const consoleMethods = ["log", "warn", "error", "info", "debug"] as const;

  consoleMethods.forEach((method) => {
    const original = console[method];
    console[method] = jest.fn().mockImplementation((...args: any[]) => {
      // Still call original during debugging or for critical errors
      if (ENABLE_CONSOLE_LOGGING) {
        original.apply(console, args);
      }
    });
  });
}
