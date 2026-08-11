/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Integration tests for `<cds-aichat-autocomplete-controller>`
 */

import { expect, fixture, html, oneEvent } from '@open-wc/testing';

import '../autocomplete-controller.js';
import '../../autocomplete/index.js';
import type AutocompleteControllerElement from '../autocomplete-controller.js';
import type { SuggestionItem, StartersConfig } from '../tiptap/types.js';

const STARTERS: StartersConfig = {
  items: [
    { id: 'hello', label: 'Say hello', value: 'Say hello' },
    { id: 'intro', label: 'Introduce yourself', value: 'Introduce yourself' },
  ],
};

async function mountWithStarters(): Promise<AutocompleteControllerElement> {
  const el = await fixture<AutocompleteControllerElement>(html`
    <cds-aichat-autocomplete-controller></cds-aichat-autocomplete-controller>
  `);
  el.starters = STARTERS;
  await el.updateComplete;
  return el;
}

/** Drive a trigger-change event directly onto the controller element. */
function fireTriggerChange(
  el: AutocompleteControllerElement,
  detail: { type: string; query: string; triggerOffset: number } | null
): void {
  el.dispatchEvent(
    new CustomEvent('cds-aichat-trigger-change', {
      detail,
      bubbles: true,
      composed: true,
    })
  );
}

function flush(): Promise<void> {
  return Promise.resolve().then(() => Promise.resolve());
}

describe('<cds-aichat-autocomplete-controller>', () => {
  describe('cds-aichat-autocomplete-item-selected', () => {
    it('fires when cds-aichat-autocomplete-select bubbles from the inner list', async () => {
      const el = await mountWithStarters();

      // Activate the starter trigger so the inner <cds-aichat-autocomplete> renders.
      fireTriggerChange(el, { type: 'starter', query: '', triggerOffset: 0 });
      await flush();
      await el.updateComplete;

      const autocomplete = el.querySelector('cds-aichat-autocomplete');
      expect(autocomplete).to.exist;

      const item: SuggestionItem = STARTERS.items[0];
      setTimeout(() =>
        autocomplete!.dispatchEvent(
          new CustomEvent('cds-aichat-autocomplete-select', {
            detail: { item },
            bubbles: true,
            composed: true,
          })
        )
      );

      const event = (await oneEvent(
        el,
        'cds-aichat-autocomplete-item-selected'
      )) as CustomEvent<{ item: SuggestionItem }>;

      expect(event.bubbles).to.equal(true);
      expect(event.composed).to.equal(true);
      expect(event.detail.item).to.deep.equal(item);
    });
  });

  describe('cds-aichat-autocomplete-item-send', () => {
    it('fires when cds-aichat-autocomplete-send bubbles from the inner list', async () => {
      const el = await mountWithStarters();

      fireTriggerChange(el, { type: 'starter', query: '', triggerOffset: 0 });
      await flush();
      await el.updateComplete;

      const autocomplete = el.querySelector('cds-aichat-autocomplete');
      expect(autocomplete).to.exist;

      const text = 'Say hello';
      setTimeout(() =>
        autocomplete!.dispatchEvent(
          new CustomEvent('cds-aichat-autocomplete-send', {
            detail: { text },
            bubbles: true,
            composed: true,
          })
        )
      );

      const event = (await oneEvent(
        el,
        'cds-aichat-autocomplete-item-send'
      )) as CustomEvent<{ text: string }>;

      expect(event.bubbles).to.equal(true);
      expect(event.composed).to.equal(true);
      expect(event.detail.text).to.equal(text);
    });
  });
});
