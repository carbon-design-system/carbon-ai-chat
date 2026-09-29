/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * `cds-aichat-custom-element` hands its resolved config to the inner
 * `cds-aichat-container` on every render. A render that changed no config field
 * must hand over the same object, or the container sees a config change that
 * is not one. A real field change must still produce a new object.
 */

import '../../../src/web-components/cds-aichat-custom-element';
import { createBaseConfig } from '../../test_helpers';

// jsdom's ShadowRoot has no `adoptedStyleSheets`, which the custom element
// spreads on connect. Same shim as the plugin-host parity spec.
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

describe('Web component: resolved config identity', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('keeps the config reference across renders that change no config field', async () => {
    const element = document.createElement('cds-aichat-custom-element') as any;
    element.config = { ...createBaseConfig() };
    element.header = { title: 'Title A' };
    document.body.appendChild(element);
    await element.updateComplete;

    const container = element.shadowRoot.querySelector('cds-aichat-container');
    const firstConfig = container.config;
    expect(firstConfig.header).toEqual({ title: 'Title A' });

    // A property the custom element owns, but that is not part of the config.
    element.onAfterRender = () => {};
    await element.updateComplete;
    expect(container.config).toBe(firstConfig);

    element.header = { title: 'Title B' };
    await element.updateComplete;
    expect(container.config).not.toBe(firstConfig);
    expect(container.config.header).toEqual({ title: 'Title B' });
  });
});
