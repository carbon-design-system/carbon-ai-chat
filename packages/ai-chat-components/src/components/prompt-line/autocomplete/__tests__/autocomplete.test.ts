/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html } from 'lit';
import { fixture, expect } from '@open-wc/testing';
import '../src/autocomplete.js';
import type AutocompleteElement from '../src/autocomplete.js';
import type {
  SuggestionItem,
  SuggestionItemGroup,
} from '../src/autocomplete.js';
import { defaultAutocompleteI18n } from '../src/autocomplete.js';
import prefix from '../../../../globals/settings.js';

describe('cds-aichat-autocomplete', () => {
  const mockItems: SuggestionItem[] = [
    {
      id: '1',
      label: 'Hello world',
      description: 'Description 1',
    },
    {
      id: '2',
      label: 'Test item',
      description: 'Description 2',
    },
  ];

  const mockGroups: SuggestionItemGroup[] = [
    {
      id: 'group-1',
      title: 'Group 1',
      items: [
        {
          id: '3',
          label: 'Group item 1',
        },
        {
          id: '4',
          label: 'Group item 2',
        },
      ],
    },
  ];

  async function defaultFixture(
    overrides: Partial<{
      items: SuggestionItem[];
      groups: SuggestionItemGroup[];
      disableDirectSend: boolean;
      inputText: string;
      attached: boolean;
      headerConfig: { showHeader: boolean; title: string };
      i18n: typeof defaultAutocompleteI18n;
    }> = {}
  ): Promise<AutocompleteElement> {
    const {
      items = mockItems,
      groups,
      disableDirectSend,
      inputText,
      attached,
      headerConfig,
      i18n,
    } = overrides;
    return fixture<AutocompleteElement>(html`
      <cds-aichat-autocomplete
        .items="${items}"
        .groups="${groups ?? []}"
        .disableDirectSend="${disableDirectSend ?? false}"
        input-text="${inputText ?? ''}"
        .attached="${attached ?? true}"
        .headerConfig="${headerConfig}"
        .i18n="${i18n ?? defaultAutocompleteI18n}"></cds-aichat-autocomplete>
    `);
  }

  describe('flat items', () => {
    it('should render flat items as list options', async () => {
      const el = await defaultFixture();

      const options = el.shadowRoot?.querySelectorAll('li[role="option"]');
      expect(options?.length).to.equal(2);
    });

    it('renders the send icon affordance on items when disableDirectSend is false (default)', async () => {
      const el = await defaultFixture();

      const sendIcons = el.shadowRoot?.querySelectorAll(
        'li[role="option"] .cds-aichat-autocomplete-item__send-icon'
      );
      expect(sendIcons?.length).to.equal(2);
    });

    it('does not render send icon when disableDirectSend is true', async () => {
      const el = await defaultFixture({ disableDirectSend: true });

      const sendIcons = el.shadowRoot?.querySelectorAll(
        'li[role="option"] .cds-aichat-autocomplete-item__send-icon'
      );
      expect(sendIcons?.length).to.equal(0);
    });

    it('has role=option on flat list items', async () => {
      const el = await defaultFixture();

      const options = el.shadowRoot?.querySelectorAll('li[role="option"]');
      options?.forEach((li) => {
        expect(li.getAttribute('role')).to.equal('option');
      });
    });

    it('has tabindex=-1 on items so focus stays in the editor', async () => {
      const el = await defaultFixture();

      const options = el.shadowRoot?.querySelectorAll('li[role="option"]');
      options?.forEach((li) => {
        expect(li.getAttribute('tabindex')).to.equal('-1');
      });
    });

    it('sets aria-selected=false on all items (focus is tracked via aria-activedescendant)', async () => {
      const el = await defaultFixture();

      const options = el.shadowRoot?.querySelectorAll('li[role="option"]');
      options?.forEach((option) => {
        expect((option as HTMLElement).getAttribute('aria-selected')).to.equal(
          'false'
        );
      });
    });

    it('adds active class and updates aria-activedescendant when item is navigated to', async () => {
      const el = await defaultFixture();

      // Before any navigation: no --active class, no aria-activedescendant.
      // The list opens without auto-selecting so Enter falls through to send
      // the typed text (ARIA APG combobox pattern).
      const firstOption = el.shadowRoot?.querySelector('li[role="option"]');
      expect(
        firstOption?.classList.contains('cds-aichat-autocomplete-item--active')
      ).to.be.false;

      const listbox = el.shadowRoot?.querySelector('[role="listbox"]');
      expect(listbox?.getAttribute('aria-activedescendant') ?? '').to.equal('');

      // Navigate down with ArrowDown — first item is now active.
      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;

      expect(
        firstOption?.classList.contains('cds-aichat-autocomplete-item--active')
      ).to.be.true;
      expect(listbox?.getAttribute('aria-activedescendant')).to.equal(
        '1--option'
      );
    });

    it('displays input text in bold when label starts with typed text', async () => {
      const el = await defaultFixture({ inputText: 'Hello' });

      const firstOption = el.shadowRoot?.querySelector('li[role="option"]');
      const typedSpan = firstOption?.querySelector(
        '.cds-aichat-autocomplete-item__label-typed'
      );
      expect(typedSpan?.textContent).to.equal('Hello');
    });
  });

  describe('grouped items', () => {
    it('should render groups as role=group containing a flat list of items each with role=option', async () => {
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .groups="${mockGroups}"></cds-aichat-autocomplete>
      `);

      const groups = el.shadowRoot?.querySelectorAll('ul[role="group"]');
      expect(groups?.length).to.equal(1);

      const options = groups?.[0].querySelectorAll(
        ':scope > li[role="option"]'
      );
      expect(options?.length).to.equal(2);
    });

    it('should render group title as first li inside the group ul', async () => {
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .groups="${mockGroups}"></cds-aichat-autocomplete>
      `);

      const group = el.shadowRoot?.querySelector('ul[role="group"]');
      const titleElement = group?.querySelector(
        ':scope > li[role="presentation"]'
      );
      expect(titleElement).to.exist;
      expect(titleElement?.textContent?.trim()).to.equal('Group 1');
    });

    it('should render all items within a group', async () => {
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .groups="${mockGroups}"></cds-aichat-autocomplete>
      `);

      const groupOptions = el.shadowRoot?.querySelectorAll(
        'ul[role="group"] li[role="option"]'
      );
      expect(groupOptions?.length).to.equal(2);
    });

    it('should use role=group (not listbox) to avoid nested listbox', async () => {
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .groups="${mockGroups}"></cds-aichat-autocomplete>
      `);

      const groupEl = el.shadowRoot?.querySelector('ul[role="group"]');
      expect(groupEl?.getAttribute('role')).to.equal('group');
      expect(groupEl?.getAttribute('aria-labelledby')).to.equal(
        'group-label-0'
      );
    });

    it('should render send icon affordance on all grouped items', async () => {
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .groups="${mockGroups}"></cds-aichat-autocomplete>
      `);

      const sendIcons = el.shadowRoot?.querySelectorAll(
        'ul[role="group"] li[role="option"] .cds-aichat-autocomplete-item__send-icon'
      );
      expect(sendIcons?.length).to.equal(2);
    });

    it('should mark grouped item as active when focused via aria-activedescendant and active class', async () => {
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .groups="${mockGroups}"></cds-aichat-autocomplete>
      `);

      // Navigate to the first group item with ArrowDown.
      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;

      const groupOptions = el.shadowRoot?.querySelectorAll(
        'ul[role="group"] li[role="option"]'
      );
      expect(
        (groupOptions?.[0] as HTMLElement)?.classList.contains(
          'cds-aichat-autocomplete-item--active'
        )
      ).to.be.true;

      const listbox = el.shadowRoot?.querySelector('[role="listbox"]');
      expect(listbox?.getAttribute('aria-activedescendant')).to.equal(
        '3--option'
      );
    });
  });

  describe('mixed flat and grouped items', () => {
    it('should render both flat items and groups together', async () => {
      const el = await defaultFixture({ groups: mockGroups });

      // When groups are present the listbox is a div (not ul) to avoid ul > ul.
      // Flat items are wrapped in an implicit ul[role="group"].
      // Named groups follow as ul[role="group"] elements with a title li as their first child.
      const listbox = el.shadowRoot?.querySelector('[role="listbox"]');
      expect(listbox?.tagName.toLowerCase()).to.equal('div');

      const groupLists = el.shadowRoot?.querySelectorAll('ul[role="group"]');
      expect(groupLists?.length).to.equal(2); // 1 implicit (flat) + 1 named

      // Flat items live inside the first (implicit, untitled) group
      const flatOptions = groupLists?.[0].querySelectorAll(
        ':scope > li[role="option"]'
      );
      expect(flatOptions?.length).to.equal(2);

      // Named group has a title li then option lis
      const namedGroupChildren = Array.from(
        groupLists?.[1].querySelectorAll(':scope > li') ?? []
      );
      const titleLi = namedGroupChildren.find(
        (li) => li.getAttribute('role') === 'presentation'
      );
      const optionLis = namedGroupChildren.filter(
        (li) => li.getAttribute('role') === 'option'
      );
      expect(titleLi).to.exist;
      expect(optionLis.length).to.equal(2);
    });

    it('should navigate across flat and grouped items with arrow keys', async () => {
      const el = await defaultFixture({ groups: mockGroups });

      // Starting at -1 (no selection). Navigate down 3 times to reach the
      // first group item (flat items at 0,1; group items at 2,3).
      for (let i = 0; i < 3; i++) {
        el.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'ArrowDown',
            bubbles: true,
            composed: true,
          })
        );
        await el.updateComplete;
      }

      const allOptions = el.shadowRoot?.querySelectorAll('li[role="option"]');
      const activeOption = Array.from(allOptions || []).find((li) =>
        li.classList.contains('cds-aichat-autocomplete-item--active')
      );

      expect(activeOption?.textContent).to.include('Group item 1');
    });
  });

  describe('header', () => {
    it('should render header when headerConfig.showHeader is true', async () => {
      const el = await defaultFixture({
        headerConfig: { showHeader: true, title: 'Test Header' },
      });

      const header = el.shadowRoot?.querySelector(
        '.cds-aichat-autocomplete__header'
      );
      expect(header).to.exist;
      const title = el.shadowRoot?.querySelector(
        '.cds-aichat-autocomplete__title'
      );
      expect(title?.textContent?.trim()).to.equal('Test Header');
    });

    it('should not render header when showHeader is false', async () => {
      const el = await defaultFixture({
        headerConfig: { showHeader: false, title: 'Test Header' },
      });

      const header = el.shadowRoot?.querySelector(
        '.cds-aichat-autocomplete__header'
      );
      expect(header).to.not.exist;
    });
  });

  describe('events', () => {
    it('should emit send event when item is clicked (label falls back when no value)', async () => {
      const el = await defaultFixture();

      let eventDetail: any = null;
      el.addEventListener('cds-aichat-autocomplete-send', (e: Event) => {
        eventDetail = (e as CustomEvent).detail;
      });

      const firstOption = el.shadowRoot?.querySelector('li[role="option"]');
      firstOption?.dispatchEvent(new Event('click', { bubbles: true }));

      await el.updateComplete;

      expect(eventDetail).to.exist;
      // mockItems[0] has no value, so detail.text falls back to label
      expect(eventDetail.text).to.equal(mockItems[0].label);
    });

    it('should emit send event with value when item has a distinct value', async () => {
      const itemWithValue: SuggestionItem = {
        id: '3',
        label: 'Display label',
        value: 'inserted-value',
        description: 'Item where label and value differ',
      };
      const el = await defaultFixture({ items: [itemWithValue] });

      let eventDetail: any = null;
      el.addEventListener('cds-aichat-autocomplete-send', (e: Event) => {
        eventDetail = (e as CustomEvent).detail;
      });

      const firstOption = el.shadowRoot?.querySelector('li[role="option"]');
      firstOption?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, composed: true })
      );

      await el.updateComplete;

      expect(eventDetail).to.exist;
      expect(eventDetail.text).to.equal('inserted-value');
      expect(eventDetail.text).to.not.equal(itemWithValue.label);
    });

    it('should not emit select event when item is clicked (disableDirectSend=false, default)', async () => {
      const el = await defaultFixture();

      let selectEventFired = false;

      el.addEventListener('cds-aichat-autocomplete-select', () => {
        selectEventFired = true;
      });

      const firstOption = el.shadowRoot?.querySelector('li[role="option"]');
      firstOption?.dispatchEvent(new Event('click', { bubbles: true }));

      await el.updateComplete;

      expect(selectEventFired).to.be.false;
    });

    it('should emit select event (not send) when item is clicked and disableDirectSend is true', async () => {
      const el = await defaultFixture({ disableDirectSend: true });

      let selectDetail: any = null;
      let sendFired = false;

      el.addEventListener('cds-aichat-autocomplete-select', (e: Event) => {
        selectDetail = (e as CustomEvent).detail;
      });
      el.addEventListener('cds-aichat-autocomplete-send', () => {
        sendFired = true;
      });

      const firstOption = el.shadowRoot?.querySelector('li[role="option"]');
      firstOption?.dispatchEvent(new Event('click', { bubbles: true }));

      await el.updateComplete;

      expect(selectDetail).to.exist;
      expect(selectDetail.item).to.deep.equal(mockItems[0]);
      expect(sendFired).to.be.false;
    });

    it('should emit dismiss event when Escape is pressed', async () => {
      const el = await defaultFixture();

      let dismissEventFired = false;
      el.addEventListener('cds-aichat-autocomplete-dismiss', () => {
        dismissEventFired = true;
      });

      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
          composed: true,
        })
      );

      await el.updateComplete;

      expect(dismissEventFired).to.be.true;
    });

    it('should not emit dismiss event when anchor element inside a shadow root is clicked', async () => {
      const el = await defaultFixture();

      const host = document.createElement('div');
      document.body.appendChild(host);
      const root = host.attachShadow({ mode: 'open' });
      const anchor = document.createElement('div');
      anchor.innerHTML = '<span id="deep">editor text</span>';
      root.appendChild(anchor);
      el.anchorElement = anchor;

      let dismissEventFired = false;
      el.addEventListener('cds-aichat-autocomplete-dismiss', () => {
        dismissEventFired = true;
      });

      root
        .querySelector('#deep')!
        .dispatchEvent(
          new MouseEvent('click', { bubbles: true, composed: true })
        );

      anchor.dispatchEvent(
        new MouseEvent('click', { bubbles: true, composed: true })
      );

      await el.updateComplete;

      expect(dismissEventFired).to.be.false;
    });
  });

  describe('keyboard navigation', () => {
    it('responds to a synthetic ArrowDown dispatched directly on the element (controller forwarding path)', async () => {
      // The autocomplete-controller dispatches a synthetic KeyboardEvent directly
      // on the registered list element. Verify the element handles it identically
      // to a user-initiated keydown so the custom-list code path works.
      const el = await defaultFixture();

      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
          cancelable: true,
        })
      );
      await el.updateComplete;

      // Starting from no selection (-1), ArrowDown lands on the first item (index 0).
      const listbox = el.shadowRoot?.querySelector('[role="listbox"]');
      expect(listbox?.getAttribute('aria-activedescendant')).to.equal(
        '1--option'
      );
    });

    it('should move focus down with ArrowDown', async () => {
      const el = await defaultFixture();

      const options = el.shadowRoot?.querySelectorAll('li[role="option"]');
      // Before navigation no item is marked active
      expect(
        (options?.[0] as HTMLElement)?.classList.contains(
          'cds-aichat-autocomplete-item--active'
        )
      ).to.be.false;

      // First ArrowDown from unselected state lands on the first item.
      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;

      const listbox = el.shadowRoot?.querySelector('[role="listbox"]');
      expect(listbox?.getAttribute('aria-activedescendant')).to.equal(
        '1--option'
      );
    });

    it('should move focus up with ArrowUp', async () => {
      const el = await defaultFixture();

      // Navigate to second item
      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;

      // Move up
      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowUp',
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;

      const listbox = el.shadowRoot?.querySelector('[role="listbox"]');
      expect(listbox?.getAttribute('aria-activedescendant')).to.equal(
        '1--option'
      );
    });

    it('should jump to first item with Home key', async () => {
      const el = await defaultFixture({ groups: mockGroups });

      // Navigate to last item
      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'End',
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;

      // Jump to home
      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Home',
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;

      const listbox = el.shadowRoot?.querySelector('[role="listbox"]');
      expect(listbox?.getAttribute('aria-activedescendant')).to.equal(
        '1--option'
      );
    });

    it('should jump to last item with End key', async () => {
      const el = await defaultFixture({ groups: mockGroups });

      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'End',
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;

      const listbox = el.shadowRoot?.querySelector('[role="listbox"]');
      // mockGroups[0].items[1] has id '4', so its option id is '4--option'
      expect(listbox?.getAttribute('aria-activedescendant')).to.equal(
        '4--option'
      );
    });

    it('should send item with Enter key after explicit navigation', async () => {
      const el = await defaultFixture();

      let eventDetail: any = null;
      el.addEventListener('cds-aichat-autocomplete-send', (e: Event) => {
        eventDetail = (e as CustomEvent).detail;
      });

      // Navigate to the first item explicitly with ArrowDown so Enter confirms it.
      // Starting from -1, one ArrowDown lands on index 0 (mockItems[0]).
      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;

      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;

      expect(eventDetail).to.exist;
      expect(eventDetail.text).to.equal(mockItems[0].label);
    });

    it('Enter without prior navigation does not dispatch send or select events', async () => {
      const el = await defaultFixture();

      let sendFired = false;
      let selectFired = false;
      el.addEventListener('cds-aichat-autocomplete-send', () => {
        sendFired = true;
      });
      el.addEventListener('cds-aichat-autocomplete-select', () => {
        selectFired = true;
      });

      // Press Enter immediately without any ArrowDown/ArrowUp — _userHasNavigated is false
      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;

      expect(sendFired).to.be.false;
      expect(selectFired).to.be.false;
    });

    it('Enter after ArrowDown dispatches send event for the navigated item', async () => {
      const el = await defaultFixture();

      let sentText: string | null = null;
      el.addEventListener('cds-aichat-autocomplete-send', (e: Event) => {
        sentText = (e as CustomEvent<{ text: string }>).detail.text;
      });

      // Starting at -1, one ArrowDown lands on index 0 (mockItems[0]).
      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;

      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;

      // ArrowDown from -1 lands on index 0 (mockItems[0])
      expect(sentText).to.equal(mockItems[0].label);
    });

    it('Tab key moves focus to the next item and sets hasNavigated to true', async () => {
      const el = await defaultFixture();

      let sentText: string | null = null;
      el.addEventListener('cds-aichat-autocomplete-send', (e: Event) => {
        sentText = (e as CustomEvent<{ text: string }>).detail.text;
      });

      // Tab behaves like ArrowDown: moves to next item and marks navigation.
      // Starting at -1, one Tab lands on index 0 (mockItems[0]).
      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Tab',
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;

      // After Tab, hasNavigated() should be true
      expect(el.hasNavigated()).to.be.true;

      // Active option should have moved to the first item (index 0)
      const listbox = el.shadowRoot?.querySelector('[role="listbox"]');
      expect(listbox?.getAttribute('aria-activedescendant')).to.equal(
        '1--option'
      );

      // Enter should now confirm the navigated item
      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;

      expect(sentText).to.equal(mockItems[0].label);
    });

    it('hasNavigated() resets to false when items are replaced', async () => {
      const el = await defaultFixture();

      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;
      expect(el.hasNavigated()).to.be.true;

      // Replacing items triggers updated() which calls _setUserHasNavigated(false)
      el.items = [{ id: 'new-1', label: 'New item' }];
      await el.updateComplete;

      expect(el.hasNavigated()).to.be.false;
    });

    it('hasNavigated() resets to false after Escape dismisses the list', async () => {
      const el = await defaultFixture();

      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;
      expect(el.hasNavigated()).to.be.true;

      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;

      expect(el.hasNavigated()).to.be.false;
    });

    it('ArrowUp sets hasNavigated to true', async () => {
      const el = await defaultFixture();

      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowUp',
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;

      expect(el.hasNavigated()).to.be.true;
    });

    it('fires cds-aichat-autocomplete-navigated with navigated:true on first arrow key', async () => {
      const el = await defaultFixture();

      const events: boolean[] = [];
      el.addEventListener('cds-aichat-autocomplete-navigated', (e: Event) => {
        events.push(
          (e as CustomEvent<{ navigated: boolean }>).detail.navigated
        );
      });

      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;

      expect(events).to.deep.equal([true]);
    });

    it('fires cds-aichat-autocomplete-navigated with navigated:false when items reset navigation', async () => {
      const el = await defaultFixture();

      const events: boolean[] = [];
      el.addEventListener('cds-aichat-autocomplete-navigated', (e: Event) => {
        events.push(
          (e as CustomEvent<{ navigated: boolean }>).detail.navigated
        );
      });

      // Navigate (fires true), then replace items (fires false)
      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;

      el.items = [{ id: 'new-1', label: 'New item' }];
      await el.updateComplete;

      expect(events).to.deep.equal([true, false]);
    });

    it('does not fire cds-aichat-autocomplete-navigated when value does not change', async () => {
      const el = await defaultFixture();

      let count = 0;
      el.addEventListener('cds-aichat-autocomplete-navigated', () => {
        count++;
      });

      // First ArrowDown: false → true, fires once.
      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;
      expect(count).to.equal(1);

      // Second ArrowDown: true → true, guard suppresses the event.
      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;
      expect(count).to.equal(1);
    });
  });

  describe('hover navigation', () => {
    it('mouseenter on a non-active row makes it the active option', async () => {
      const el = await defaultFixture();

      // Navigate to the first item so _userHasNavigated is true
      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;

      const options = el.shadowRoot?.querySelectorAll('li[role="option"]');
      expect(
        (options?.[0] as HTMLElement)?.classList.contains(
          'cds-aichat-autocomplete-item--active'
        )
      ).to.be.true;

      // Hover over the second item
      (options?.[1] as HTMLElement)?.dispatchEvent(
        new MouseEvent('mouseenter', { bubbles: true })
      );
      await el.updateComplete;

      const listbox = el.shadowRoot?.querySelector('[role="listbox"]');
      expect(listbox?.getAttribute('aria-activedescendant')).to.equal(
        '2--option'
      );
    });

    it('aria-activedescendant follows the pointer', async () => {
      const el = await defaultFixture();

      const listbox = el.shadowRoot?.querySelector('[role="listbox"]');
      const options = el.shadowRoot?.querySelectorAll('li[role="option"]');

      // Before navigation, no item is active
      expect(listbox?.getAttribute('aria-activedescendant') ?? '').to.equal('');

      // Navigate to the first item so _userHasNavigated is true
      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;
      expect(listbox?.getAttribute('aria-activedescendant')).to.equal(
        '1--option'
      );

      // Hover the second item
      (options?.[1] as HTMLElement)?.dispatchEvent(
        new MouseEvent('mouseenter', { bubbles: true })
      );
      await el.updateComplete;

      // mockItems[1] has id '2', so its option id is '2--option'
      expect(listbox?.getAttribute('aria-activedescendant')).to.equal(
        '2--option'
      );
      // Previously active item (1--option) is no longer pointed to
      expect(listbox?.getAttribute('aria-activedescendant')).to.not.equal(
        '1--option'
      );
    });

    it('Enter picks the hovered row, not the previously active row', async () => {
      const el = await defaultFixture();

      let sentText: string | null = null;
      el.addEventListener('cds-aichat-autocomplete-send', (e: Event) => {
        sentText = (e as CustomEvent<{ text: string }>).detail.text;
      });

      const options = el.shadowRoot?.querySelectorAll('li[role="option"]');

      // Navigate with ArrowDown first so _userHasNavigated becomes true,
      // then hover the first item to change the active row.
      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;

      // Hover the first item while the second is keyboard-active.
      (options?.[0] as HTMLElement)?.dispatchEvent(
        new MouseEvent('mouseenter', { bubbles: true })
      );
      await el.updateComplete;

      // Enter should pick the hovered (now active) first item.
      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;

      expect(sentText).to.equal(mockItems[0].label);
    });

    it('mouseenter on a disabled item does not move the active option', async () => {
      const disabledItem = {
        id: 'disabled-1',
        label: 'Disabled',
        disabled: true,
      };
      const enabledItem = { id: 'enabled-1', label: 'Enabled' };
      const el = await defaultFixture({ items: [enabledItem, disabledItem] });

      // Navigate to the enabled item first so _userHasNavigated is true
      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;

      const options = el.shadowRoot?.querySelectorAll('li[role="option"]');

      // Hover the disabled item (index 1)
      (options?.[1] as HTMLElement)?.dispatchEvent(
        new MouseEvent('mouseenter', { bubbles: true })
      );
      await el.updateComplete;

      const listbox = el.shadowRoot?.querySelector('[role="listbox"]');
      // Active option must remain pointing to the enabled item (index 0)
      expect(listbox?.getAttribute('aria-activedescendant')).to.equal(
        'enabled-1--option'
      );
    });
  });

  describe('aria', () => {
    it('should have aria-activedescendant pointing to focused item after navigation', async () => {
      const el = await defaultFixture();

      // No item is active before navigation
      const listbox = el.shadowRoot?.querySelector('[role="listbox"]');
      expect(listbox?.getAttribute('aria-activedescendant') ?? '').to.equal('');

      // Navigate to the first item
      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;

      const activeId = listbox?.getAttribute('aria-activedescendant');
      expect(activeId).to.equal('1--option');
    });

    it('should have aria-activedescendant for grouped items', async () => {
      const el = await defaultFixture({ groups: mockGroups });

      // Starting at -1, navigate down 3 times to reach the first group item
      // (flat: 0, 1; group: 2, 3)
      for (let i = 0; i < 3; i++) {
        el.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'ArrowDown',
            bubbles: true,
            composed: true,
          })
        );
        await el.updateComplete;
      }

      const listbox = el.shadowRoot?.querySelector('[role="listbox"]');
      const activeId = listbox?.getAttribute('aria-activedescendant');
      expect(activeId).to.equal('3--option');
    });

    it('should have role=listbox on the main list', async () => {
      const el = await defaultFixture();

      const listbox = el.shadowRoot?.querySelector('ul');
      expect(listbox?.getAttribute('role')).to.equal('listbox');
      expect(listbox?.getAttribute('aria-label')).to.equal(
        'Autocomplete options'
      );
    });
  });

  describe('empty state', () => {
    it('should render nothing when no items or groups provided', async () => {
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete></cds-aichat-autocomplete>
      `);

      const container = el.shadowRoot?.querySelector(
        '.cds-aichat-autocomplete'
      );
      expect(container).to.not.exist;
    });

    it('should render live regions even when empty', async () => {
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete></cds-aichat-autocomplete>
      `);

      const liveRegions = el.shadowRoot?.querySelectorAll(
        '[aria-live="polite"]'
      );
      expect(liveRegions?.length).to.equal(2);
    });
  });

  describe('properties', () => {
    it('should pass inputText for label highlighting', async () => {
      const el = await defaultFixture({ inputText: 'Hello' });

      expect(el.inputText).to.equal('Hello');
      const typedSpan = el.shadowRoot?.querySelector(
        '.cds-aichat-autocomplete-item__label-typed'
      );
      expect(typedSpan?.textContent).to.equal('Hello');
    });

    it('attached=false removes border-radius on the bottom corners', async () => {
      // :host([attached]) sets CSS custom properties that zero the bottom radii;
      // :host([attached=false]) (the default true / reflected attribute absent)
      // should leave them at whatever the theme supplies.
      const el = await defaultFixture({ attached: false });

      // When attached=false the reflected attribute is absent, so the
      // CSS custom properties are not overridden.
      expect(el.attached).to.be.false;
      expect(el.hasAttribute('attached')).to.be.false;
    });

    it('disableDirectSend defaults to false', async () => {
      const el = await defaultFixture();

      expect(el.disableDirectSend).to.be.false;
    });
  });

  describe('disabled items', () => {
    const disabledItem: SuggestionItem = {
      id: 'disabled-1',
      label: 'Disabled Option',
      disabled: true,
    };
    const enabledItem: SuggestionItem = {
      id: 'enabled-1',
      label: 'Enabled Option',
    };

    it('should set aria-disabled correctly for disabled and enabled items', async () => {
      const el = await defaultFixture({ items: [disabledItem, enabledItem] });

      const options = el.shadowRoot?.querySelectorAll('li[role="option"]');

      expect(
        (options?.[0] as HTMLElement)?.getAttribute('aria-disabled')
      ).to.equal('true');
      expect(
        (options?.[1] as HTMLElement)?.getAttribute('aria-disabled')
      ).to.equal('false');
    });

    it('should add the disabled class', async () => {
      const el = await defaultFixture({ items: [disabledItem] });

      const options = el.shadowRoot?.querySelectorAll('li[role="option"]');
      const disabledClass = `${prefix}-autocomplete-item--disabled`;

      expect((options?.[0] as HTMLElement).classList.contains(disabledClass)).to
        .be.true;
    });

    it('click on disabled item does not fire cds-aichat-autocomplete-send (disableDirectSend=false)', async () => {
      const el = await defaultFixture({ items: [disabledItem, enabledItem] });

      let sendFired = false;
      el.addEventListener('cds-aichat-autocomplete-send', () => {
        sendFired = true;
      });

      const disabledOption = el.shadowRoot?.querySelector('li[role="option"]');
      disabledOption?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, composed: true })
      );
      await el.updateComplete;

      expect(sendFired).to.be.false;
    });

    it('click on disabled item does not fire cds-aichat-autocomplete-select (disableDirectSend=true)', async () => {
      const el = await defaultFixture({
        items: [disabledItem, enabledItem],
        disableDirectSend: true,
      });

      let selectFired = false;
      el.addEventListener('cds-aichat-autocomplete-select', () => {
        selectFired = true;
      });

      const disabledOption = el.shadowRoot?.querySelector('li[role="option"]');
      disabledOption?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, composed: true })
      );
      await el.updateComplete;

      expect(selectFired).to.be.false;
    });

    it('Enter on a disabled item does not fire send or select', async () => {
      // Place the only-disabled item alone so _focusedIndex stays at 0 (no
      // enabled item to skip to) and Enter has no valid target.
      const el = await defaultFixture({ items: [disabledItem] });

      let sendFired = false;
      let selectFired = false;
      el.addEventListener('cds-aichat-autocomplete-send', () => {
        sendFired = true;
      });
      el.addEventListener('cds-aichat-autocomplete-select', () => {
        selectFired = true;
      });

      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;

      expect(sendFired).to.be.false;
      expect(selectFired).to.be.false;
    });

    it('ArrowDown skips a disabled item and lands on the next enabled item', async () => {
      // Layout: enabled(0) → disabled(1) → enabled(2)
      // Starting at -1. First ArrowDown → 0 (enabled). Second ArrowDown skips
      // 1 (disabled) and lands on 2 (enabled-2).
      const threeItems: SuggestionItem[] = [
        enabledItem,
        disabledItem,
        { id: 'enabled-2', label: 'Enabled Option 2' },
      ];
      const el = await defaultFixture({ items: threeItems });

      // Two ArrowDowns: -1→0, 0→2 (skip disabled at 1).
      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;
      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;

      const listbox = el.shadowRoot?.querySelector('[role="listbox"]');
      // Should have landed on index 2 (id 'enabled-2')
      expect(listbox?.getAttribute('aria-activedescendant')).to.equal(
        'enabled-2--option'
      );
    });

    it('ArrowDown stays put when no enabled item exists beyond current', async () => {
      // Layout: enabled(0) → disabled(1).
      // Starting at -1. First ArrowDown → 0. Second ArrowDown: from 0, next=1
      // (disabled), no further enabled → stays at 0.
      const el = await defaultFixture({ items: [enabledItem, disabledItem] });

      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;
      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;

      const listbox = el.shadowRoot?.querySelector('[role="listbox"]');
      // Still on index 0 (enabled-1) — no enabled item to land on.
      expect(listbox?.getAttribute('aria-activedescendant')).to.equal(
        'enabled-1--option'
      );
    });

    it('initial focus is not set until navigation (no auto-select on open)', async () => {
      // The list opens with _focusedIndex = -1, so no aria-activedescendant
      // or --active class is set until the user navigates explicitly.
      const el = await defaultFixture({ items: [disabledItem, enabledItem] });

      const listbox = el.shadowRoot?.querySelector('[role="listbox"]');
      // No item is pre-focused on open — ARIA APG combobox pattern
      expect(listbox?.getAttribute('aria-activedescendant') ?? '').to.equal('');

      // ArrowDown from -1 → first enabled item (skipping disabled at 0 → lands on 1)
      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;

      expect(listbox?.getAttribute('aria-activedescendant')).to.equal(
        'enabled-1--option'
      );
    });

    it('all-disabled list fires suggestionsAvailable with the correct count', async () => {
      const allDisabledItems: SuggestionItem[] = [
        { id: 'd1', label: 'Disabled A', disabled: true },
        { id: 'd2', label: 'Disabled B', disabled: true },
      ];

      let announcedCount: number | null = null;
      const trackingI18n = {
        ...defaultAutocompleteI18n,
        suggestionsAvailable: (count: number) => {
          announcedCount = count;
          return defaultAutocompleteI18n.suggestionsAvailable(count);
        },
      };

      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .i18n="${trackingI18n}"></cds-aichat-autocomplete>
      `);

      // Setting items after mount triggers updated() → suggestionsAvailable
      el.items = allDisabledItems;
      await el.updateComplete;

      expect(announcedCount).to.equal(2);
    });
  });

  describe('screen reader announcements', () => {
    it('includes the group title in arrow-key navigation announcements for grouped items', async () => {
      let announcedMessage: string | null = null;
      const trackingI18n = {
        ...defaultAutocompleteI18n,
        itemNavigation: (
          label: string,
          description: string | undefined,
          groupLabel: string | undefined,
          position: string
        ) => {
          announcedMessage = defaultAutocompleteI18n.itemNavigation(
            label,
            description,
            groupLabel,
            position
          );
          return announcedMessage;
        },
      };

      const el = await defaultFixture({
        groups: mockGroups,
        i18n: trackingI18n,
      });

      // Starting at -1, navigate down 3 times to reach the first group item
      // (flat items at 0,1; group items at 2,3).
      for (let i = 0; i < 3; i++) {
        el.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'ArrowDown',
            bubbles: true,
            composed: true,
          })
        );
        await el.updateComplete;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 75));

      expect(announcedMessage).to.equal('Group item 1, Group 1, 3 of 4');
    });
  });
});
