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

import '../autocomplete-controller-element.js';
import '../../autocomplete/index.js';
import type AutocompleteControllerElement from '../autocomplete-controller-element.js';
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

  describe('cds-aichat-list-navigated + listNavigated', () => {
    it('fires cds-aichat-list-navigated with navigated:true when cds-aichat-autocomplete-navigated bubbles in', async () => {
      const el = await mountWithStarters();

      fireTriggerChange(el, { type: 'starter', query: '', triggerOffset: 0 });
      await flush();
      await el.updateComplete;

      const autocomplete = el.querySelector('cds-aichat-autocomplete');
      expect(autocomplete).to.exist;

      setTimeout(() =>
        autocomplete!.dispatchEvent(
          new CustomEvent('cds-aichat-autocomplete-navigated', {
            detail: { navigated: true },
            bubbles: true,
            composed: true,
          })
        )
      );

      const event = (await oneEvent(
        el,
        'cds-aichat-list-navigated'
      )) as CustomEvent<{ navigated: boolean }>;

      expect(event.bubbles).to.equal(true);
      expect(event.composed).to.equal(true);
      expect(event.detail.navigated).to.equal(true);
    });

    it('exposes listNavigated getter reflecting the current navigation state', async () => {
      const el = await mountWithStarters();

      fireTriggerChange(el, { type: 'starter', query: '', triggerOffset: 0 });
      await flush();
      await el.updateComplete;

      const autocomplete = el.querySelector('cds-aichat-autocomplete');
      expect(autocomplete).to.exist;
      expect(el.listNavigated).to.equal(false);

      // Navigate into the list.
      autocomplete!.dispatchEvent(
        new CustomEvent('cds-aichat-autocomplete-navigated', {
          detail: { navigated: true },
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;
      expect(el.listNavigated).to.equal(true);

      // Navigation clears.
      autocomplete!.dispatchEvent(
        new CustomEvent('cds-aichat-autocomplete-navigated', {
          detail: { navigated: false },
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;
      expect(el.listNavigated).to.equal(false);
    });

    it('fires cds-aichat-list-navigated with navigated:false when navigation clears', async () => {
      const el = await mountWithStarters();

      fireTriggerChange(el, { type: 'starter', query: '', triggerOffset: 0 });
      await flush();
      await el.updateComplete;

      const autocomplete = el.querySelector('cds-aichat-autocomplete');

      // First set navigated to true so we have state to clear.
      autocomplete!.dispatchEvent(
        new CustomEvent('cds-aichat-autocomplete-navigated', {
          detail: { navigated: true },
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;

      // Now clear it and await the event.
      setTimeout(() =>
        autocomplete!.dispatchEvent(
          new CustomEvent('cds-aichat-autocomplete-navigated', {
            detail: { navigated: false },
            bubbles: true,
            composed: true,
          })
        )
      );

      const event = (await oneEvent(
        el,
        'cds-aichat-list-navigated'
      )) as CustomEvent<{ navigated: boolean }>;

      expect(event.detail.navigated).to.equal(false);
    });

    it('does not fire cds-aichat-list-navigated when the value does not change', async () => {
      const el = await mountWithStarters();

      fireTriggerChange(el, { type: 'starter', query: '', triggerOffset: 0 });
      await flush();
      await el.updateComplete;

      const autocomplete = el.querySelector('cds-aichat-autocomplete');

      // First navigate to set state to true.
      autocomplete!.dispatchEvent(
        new CustomEvent('cds-aichat-autocomplete-navigated', {
          detail: { navigated: true },
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;

      let extraFired = false;
      el.addEventListener('cds-aichat-list-navigated', () => {
        extraFired = true;
      });

      // Dispatch the same value again — should be a no-op.
      autocomplete!.dispatchEvent(
        new CustomEvent('cds-aichat-autocomplete-navigated', {
          detail: { navigated: true },
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;
      expect(extraFired).to.equal(false);
    });
  });
});
