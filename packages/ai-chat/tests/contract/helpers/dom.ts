/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * DOM lookups for contract tests. A contract test reads rendered output only
 * through the public test IDs (`PageObjectId`), slots, and parts — never a
 * Carbon tag name, a class, or the shape of the markup (plan D4.2).
 */

import { PageObjectId } from '../../../src/aiChatEntry';

/** Every element under `root`, through open shadow roots. */
function* walk(root: ParentNode): Generator<Element> {
  for (const element of Array.from(root.querySelectorAll('*'))) {
    yield element;
    if (element.shadowRoot) {
      yield* walk(element.shadowRoot);
    }
  }
}

/** The first element with this public test ID, searching shadow roots. */
export function byTestId(
  testId: PageObjectId | string,
  root: ParentNode = document
): HTMLElement | null {
  for (const element of walk(root)) {
    if (element.getAttribute('data-testid') === testId) {
      return element as HTMLElement;
    }
  }
  return null;
}

/** Every element with this public test ID, searching shadow roots. */
export function allByTestId(
  testId: PageObjectId | string,
  root: ParentNode = document
): HTMLElement[] {
  return [...walk(root)].filter(
    (element) => element.getAttribute('data-testid') === testId
  ) as HTMLElement[];
}

/** The light-DOM children a host slotted under this slot name. */
export function slotted(host: Element, name: string): Element[] {
  return Array.from(host.querySelectorAll(`[slot="${name}"]`));
}
