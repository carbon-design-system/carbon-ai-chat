/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html, fixture, expect } from '@open-wc/testing';
import '@carbon/ai-chat-components/es/components/chain-of-thought/index.js';
import ChainOfThoughtToggle from '@carbon/ai-chat-components/es/components/chain-of-thought/src/chain-of-thought-toggle.js';

function toggleButton(el: ChainOfThoughtToggle): HTMLButtonElement {
  return el.shadowRoot!.querySelector('button')!;
}

describe('chain-of-thought toggle', function () {
  it('gives the button no aria-controls, even with a panel ID', async () => {
    const el = await fixture<ChainOfThoughtToggle>(
      html`<cds-aichat-chain-of-thought-toggle
        panel-id="reasoning-panel"></cds-aichat-chain-of-thought-toggle>`
    );
    expect(toggleButton(el).hasAttribute('aria-controls')).to.equal(false);
  });

  it('marks the button expanded or collapsed as the panel opens and closes', async () => {
    const el = await fixture<ChainOfThoughtToggle>(
      html`<cds-aichat-chain-of-thought-toggle
        panel-id="reasoning-panel"></cds-aichat-chain-of-thought-toggle>`
    );
    expect(toggleButton(el).getAttribute('aria-expanded')).to.equal('false');
    toggleButton(el).click();
    await el.updateComplete;
    expect(toggleButton(el).getAttribute('aria-expanded')).to.equal('true');
    toggleButton(el).click();
    await el.updateComplete;
    expect(toggleButton(el).getAttribute('aria-expanded')).to.equal('false');
  });
});
