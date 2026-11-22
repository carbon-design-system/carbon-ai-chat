/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import '@testing-library/jest-dom/vitest';

// Set to true to enable console output during tests for debugging
const ENABLE_CONSOLE_LOGGING = false;

// Mock Symbol.for for Lit's use of symbols and ensure all needed symbols exist
global.Symbol.for = global.Symbol.for || ((key: string) => Symbol(key));

// DOM mocks for DOM specs. A spec that runs in Node (`@vitest-environment node`),
// such as the headless SDK's, has no window and skips them.
function installDomMocks() {
  (globalThis as any).document = global.document;

  // Mock CSS template literal functions
  (global as any).__CSS_TAG_SYMBOL__ = Symbol('css-tag');

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
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null as any,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock document.execCommand since it's not available in jsdom but is used
  // internally by ProseMirror (e.g. safariShadowSelectionRange)
  if (!document.execCommand) {
    document.execCommand = vi.fn().mockReturnValue(false);
  }

  // Mock elementFromPoint since it's not available in jsdom but is used
  // internally by ProseMirror/Tiptap (posAtCoords -> root.elementFromPoint).
  // Tiptap's placeholder extension viewport tracking (@tiptap/extensions >= 3.27)
  // calls this on editor mount; the editor lives in a shadow root, so patch both
  // Document and ShadowRoot. Returning null mirrors the real "no element at point"
  // case, which ProseMirror handles gracefully.
  if (!Document.prototype.elementFromPoint) {
    Document.prototype.elementFromPoint = vi.fn().mockReturnValue(null);
  }
  if (
    typeof ShadowRoot !== 'undefined' &&
    !ShadowRoot.prototype.elementFromPoint
  ) {
    (ShadowRoot.prototype as any).elementFromPoint = vi
      .fn()
      .mockReturnValue(null);
  }

  // `cds-aichat-custom-element` appends its hide-sheet to the shadow root's
  // `adoptedStyleSheets`, which jsdom's ShadowRoot does not implement, so
  // connecting that element would throw before anything renders.
  const adoptedSheets = new WeakMap<ShadowRoot, unknown[]>();
  if (!('adoptedStyleSheets' in ShadowRoot.prototype)) {
    Object.defineProperty(ShadowRoot.prototype, 'adoptedStyleSheets', {
      configurable: true,
      get(this: ShadowRoot) {
        return adoptedSheets.get(this) ?? [];
      },
      set(this: ShadowRoot, sheets: unknown[]) {
        adoptedSheets.set(this, sheets);
      },
    });
  }

  // happy-dom 21 has no `assignedSlot`, which jsdom and browsers give every
  // element and text node. Return the open shadow root's slot that lists the
  // node among its assigned nodes, as the DOM standard defines it.
  for (const prototype of [Element.prototype, Text.prototype]) {
    if (!('assignedSlot' in prototype)) {
      Object.defineProperty(prototype, 'assignedSlot', {
        configurable: true,
        get(this: Element | Text): HTMLSlotElement | null {
          const host = this.parentNode;
          const root = host instanceof Element ? host.shadowRoot : null;
          if (!root) {
            return null;
          }
          for (const slot of Array.from(root.querySelectorAll('slot'))) {
            if (slot.assignedNodes().includes(this)) {
              return slot;
            }
          }
          return null;
        },
      });
    }
  }

  // happy-dom 21's ShadowRoot.activeElement climbs past the document and throws
  // a TypeError when focus sits in another shadow tree. It throws exactly when
  // the focused element is outside this root, where the DOM answers null.
  const shadowActive = Object.getOwnPropertyDescriptor(
    ShadowRoot.prototype,
    'activeElement'
  );
  if ((globalThis as any).happyDOM && shadowActive?.get) {
    Object.defineProperty(ShadowRoot.prototype, 'activeElement', {
      configurable: true,
      get(this: ShadowRoot): Element | null {
        try {
          return shadowActive.get.call(this);
        } catch (error) {
          if (error instanceof TypeError) {
            return null;
          }
          throw error;
        }
      },
    });
  }

  // Replace ResizeObserver with an inert mock. Code calls it with `new`, and a
  // Vitest mock called that way needs a function implementation, not an arrow.
  (global as any).ResizeObserver = vi.fn().mockImplementation(function () {
    return {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    };
  });
}

if (typeof window !== 'undefined') {
  installDomMocks();
}

// Testing Library's waitFor advances fake timers while it polls only when it
// finds a `jest` global, as Jest's fake timers did. Give it that one method.
(globalThis as any).jest = {
  advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms),
};

// Vitest turns off happy-dom's error capturing, so an exception thrown by an
// event listener or timer escapes to its caller. jsdom and browsers report it
// as a window `error` event and keep dispatching. Restore that behavior.
const happyDOM = (globalThis as any).happyDOM;
if (happyDOM?.settings) {
  happyDOM.settings.disableErrorCapturing = false;
  // Jest's jsdom environment ran inline event handlers (runScripts:
  // 'dangerously'); happy-dom runs them only with evaluation on.
  happyDOM.settings.enableJavaScriptEvaluation = true;
  // Run inline code only; never fetch a script's src.
  happyDOM.settings.disableJavaScriptFileLoading = true;
}

// In a page, an exception thrown by a timer or microtask callback is reported
// as a window `error` event, and the page keeps running. Jest's jsdom timers
// did that; Vitest keeps Node's timers, where it would be an uncaught error.
if (typeof window !== 'undefined') {
  const reportException = (error: unknown) => {
    const event = new ErrorEvent('error', {
      error,
      message: error instanceof Error ? error.message : String(error),
      cancelable: true,
    });
    window.dispatchEvent(event);
  };
  const guard =
    (callback: (...args: unknown[]) => unknown) =>
    (...args: unknown[]): void => {
      try {
        callback(...args);
      } catch (error) {
        reportException(error);
      }
    };
  const wrap = <T extends (...args: any[]) => unknown>(original: T): T => {
    const wrapped = (callback: unknown, ...rest: unknown[]) =>
      original(
        typeof callback === 'function'
          ? guard(callback as (...args: unknown[]) => unknown)
          : callback,
        ...rest
      );
    // Keep properties such as setTimeout's promisified form.
    const own: PropertyDescriptorMap =
      Object.getOwnPropertyDescriptors(original);
    delete own.length;
    delete own.name;
    delete own.prototype;
    Object.defineProperties(wrapped, own);
    return wrapped as unknown as T;
  };
  globalThis.setTimeout = wrap(globalThis.setTimeout);
  globalThis.setInterval = wrap(globalThis.setInterval);
  globalThis.queueMicrotask = wrap(globalThis.queueMicrotask);
}

// Jest's jsdom environment failed a test on an uncaught page error: when no
// test code listened for window `error` events, it re-emitted each one's
// error as the process's `uncaughtException`. Do the same here, so a thrown
// listener, timer or microtask callback fails the run instead of reaching
// only the muted console. happy-dom can give `window` and `globalThis` their
// own bound copies of `addEventListener`, so count listeners through both.
if (typeof window !== 'undefined') {
  let userErrorListeners = 0;
  const addToWindow = window.addEventListener.bind(window);
  const targets = [...new Set([window, globalThis])] as EventTarget[];
  targets.forEach((target) => {
    const add = target.addEventListener;
    const remove = target.removeEventListener;
    target.addEventListener = function (
      this: EventTarget,
      ...args: Parameters<EventTarget['addEventListener']>
    ) {
      if (args[0] === 'error') {
        userErrorListeners += 1;
      }
      return add.apply(this, args);
    };
    target.removeEventListener = function (
      this: EventTarget,
      ...args: Parameters<EventTarget['removeEventListener']>
    ) {
      if (args[0] === 'error') {
        userErrorListeners -= 1;
      }
      return remove.apply(this, args);
    };
  });
  // Registered through the saved original, so it is not counted as a user's.
  addToWindow('error', (event: ErrorEvent) => {
    if (userErrorListeners === 0 && event.error != null) {
      process.emit('uncaughtException', event.error);
    }
  });
}

// Suppress console output during tests unless debugging
if (!ENABLE_CONSOLE_LOGGING) {
  const consoleMethods = ['log', 'warn', 'error', 'info', 'debug'] as const;

  consoleMethods.forEach((method) => {
    const original = console[method];
    console[method] = vi.fn().mockImplementation((...args: any[]) => {
      // Still call original during debugging or for critical errors
      if (ENABLE_CONSOLE_LOGGING) {
        original.apply(console, args);
      }
    });
  });
}
