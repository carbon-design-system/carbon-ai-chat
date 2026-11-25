/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { getConfig } from '@testing-library/react';
import type { Mock } from 'vitest';

/**
 * Waits that react to what the chat actually does, not to a clock.
 *
 * Testing Library's `waitFor` gives up after one second. A loaded machine can
 * take longer than that to load a lazy chunk or finish a render, so a correct
 * test fails. These waits recheck only when the DOM changes or a watched call
 * happens. They have no deadline of their own: the test timeout still bounds
 * them. Like `waitFor`, they run inside Testing Library's async wrapper, so
 * React updates that land while waiting need no `act`.
 */

/**
 * Every shadow root of `node` and under it, including nested ones. A watched
 * element's own shadow root counts: a custom element renders there.
 */
function shadowRootsUnder(node: Node): ShadowRoot[] {
  const found: ShadowRoot[] = [];
  const own = node instanceof Element ? node.shadowRoot : null;
  if (own) {
    found.push(own);
  }
  const visit = (current: Node) => {
    const walker = document.createTreeWalker(current, NodeFilter.SHOW_ELEMENT);
    for (let next = walker.nextNode(); next; next = walker.nextNode()) {
      const { shadowRoot } = next as Element;
      if (shadowRoot) {
        found.push(shadowRoot);
        visit(shadowRoot);
      }
    }
  };
  visit(node);
  if (own) {
    visit(own);
  }
  return found;
}

/**
 * Resolves once `check` stops throwing. It rechecks after each DOM change under
 * `roots`, including shadow roots that appear inside them. A check that never
 * passes fails as a test timeout at the line of the awaiting test.
 */
export function untilDom(
  roots: Node | Node[],
  check: () => void
): Promise<void> {
  const watched = Array.isArray(roots) ? roots : [roots];
  return getConfig().asyncWrapper(
    () =>
      new Promise<void>((resolve) => {
        const observed = new Set<Node>();
        const observer = new MutationObserver(() => {
          observeAll();
          attempt();
        });
        function observeAll() {
          watched
            .flatMap((root) => [root, ...shadowRootsUnder(root)])
            .forEach((root) => {
              if (!observed.has(root)) {
                observed.add(root);
                observer.observe(root, {
                  attributes: true,
                  characterData: true,
                  childList: true,
                  subtree: true,
                });
              }
            });
        }
        function attempt() {
          try {
            check();
          } catch {
            return;
          }
          observer.disconnect();
          resolve();
        }
        observeAll();
        attempt();
      })
  );
}

/**
 * Resolves once `mock` has been called `count` times. It wraps the mock's
 * implementation, so set any implementation first.
 */
export function untilCalled(mock: Mock, count = 1): Promise<void> {
  return getConfig().asyncWrapper(
    () =>
      new Promise<void>((resolve) => {
        if (mock.mock.calls.length >= count) {
          resolve();
          return;
        }
        const inner = mock.getMockImplementation();
        mock.mockImplementation((...args: unknown[]) => {
          const result = inner?.(...args);
          if (mock.mock.calls.length >= count) {
            resolve();
          }
          return result;
        });
      })
  );
}
