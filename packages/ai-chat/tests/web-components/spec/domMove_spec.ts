/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Moving `cds-aichat-container` to a new parent keeps the React application
 * running. The deferred-unmount guard in `cds-aichat-internal` must cancel the
 * React root teardown when the element reconnects within the same macrotask
 * (a DOM move). A real removal — one where the element stays detached past the
 * timer — must still tear down and then re-render cleanly on re-attach.
 */

import '../../../src/web-components/cds-aichat-container';
import { createBaseConfig, setupAfterEach } from '../../test_helpers';
import { waitFor } from '@testing-library/react';

// jsdom's ShadowRoot has no `adoptedStyleSheets`, which the Lit custom elements
// spread on connect. Apply the same shim used by other web-component specs.
const adopted = new WeakMap<ShadowRoot, unknown[]>();
if (!('adoptedStyleSheets' in ShadowRoot.prototype)) {
  Object.defineProperty(ShadowRoot.prototype, 'adoptedStyleSheets', {
    configurable: true,
    get(this: ShadowRoot) {
      return adopted.get(this) ?? [];
    },
    set(this: ShadowRoot, sheets: unknown[]) {
      adopted.set(this, sheets);
    },
  });
}

type ContainerElement = HTMLElement & {
  config: ReturnType<typeof createBaseConfig>;
  updateComplete: Promise<boolean>;
};

describe('cds-aichat-container: DOM move survival', () => {
  afterEach(setupAfterEach);

  it('keeps the React root alive when the element is moved to a new parent in the same task', async () => {
    const element = document.createElement(
      'cds-aichat-container'
    ) as ContainerElement;
    element.config = createBaseConfig();
    document.body.appendChild(element);
    await element.updateComplete;

    // Locate the internal Lit element that owns the React root.
    const internal = element.shadowRoot?.querySelector('cds-aichat-internal');
    expect(internal).toBeTruthy();

    // Capture the react container node so we can check identity after the move.
    const reactContainer = (internal as any)?.reactContainer as
      HTMLElement | undefined;
    expect(reactContainer).toBeTruthy();

    // Perform the DOM move in the same synchronous block.
    const newParent = document.createElement('div');
    document.body.appendChild(newParent);
    document.body.removeChild(element);
    newParent.appendChild(element);

    // Wait past the deferred-teardown timer (macrotask boundary).
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
    await element.updateComplete;

    // The React root reference must survive — same container node, not null.
    const rootAfter = (internal as any)?.root;
    expect(rootAfter).not.toBeNull();
    expect(rootAfter).not.toBeUndefined();

    const containerAfter = (internal as any)?.reactContainer;
    expect(containerAfter).toBe(reactContainer);
  });

  it('tears down and re-creates the React root after a real removal', async () => {
    const element = document.createElement(
      'cds-aichat-container'
    ) as ContainerElement;
    element.config = createBaseConfig();
    document.body.appendChild(element);
    await element.updateComplete;

    const internal = element.shadowRoot?.querySelector('cds-aichat-internal');
    expect(internal).toBeTruthy();

    // Real removal: remove and let the deferred timer fire.
    document.body.removeChild(element);
    await new Promise<void>((resolve) => setTimeout(resolve, 10));

    // Root should have been cleared after real teardown.
    const rootAfterTeardown = (internal as any)?.root;
    expect(rootAfterTeardown).toBeNull();

    // Re-attach to the DOM and allow the element to re-render.
    const newParent = document.createElement('div');
    document.body.appendChild(newParent);
    newParent.appendChild(element);
    await element.updateComplete;

    // A fresh root must have been created on reconnect.
    await waitFor(
      () => {
        const rootAfterReattach = (internal as any)?.root;
        expect(rootAfterReattach).not.toBeNull();
        expect(rootAfterReattach).not.toBeUndefined();
      },
      { timeout: 5000 }
    );
  });
});
