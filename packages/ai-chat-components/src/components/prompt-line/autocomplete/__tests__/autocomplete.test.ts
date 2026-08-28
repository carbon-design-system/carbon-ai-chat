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

  describe('flat items', () => {
    it('should render flat items as list options', async () => {
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${mockItems}"></cds-aichat-autocomplete>
      `);

      const options = el.shadowRoot?.querySelectorAll('li[role="option"]');
      expect(options?.length).to.equal(2);
    });

    it('renders the send icon affordance on items when disableDirectSend is false (default)', async () => {
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${mockItems}"></cds-aichat-autocomplete>
      `);

      const sendIcons = el.shadowRoot?.querySelectorAll(
        'li[role="option"] .cds-aichat-autocomplete-item__send-icon'
      );
      expect(sendIcons?.length).to.equal(2);
    });

    it('does not render send icon when disableDirectSend is true', async () => {
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${mockItems}"
          .disableDirectSend="${true}"></cds-aichat-autocomplete>
      `);

      const sendIcons = el.shadowRoot?.querySelectorAll(
        'li[role="option"] .cds-aichat-autocomplete-item__send-icon'
      );
      expect(sendIcons?.length).to.equal(0);
    });

    it('has role=option on flat list items', async () => {
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${mockItems}"></cds-aichat-autocomplete>
      `);

      const options = el.shadowRoot?.querySelectorAll('li[role="option"]');
      options?.forEach((li) => {
        expect(li.getAttribute('role')).to.equal('option');
      });
    });

    it('has tabindex=-1 on items so focus stays in the editor', async () => {
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${mockItems}"></cds-aichat-autocomplete>
      `);

      const options = el.shadowRoot?.querySelectorAll('li[role="option"]');
      options?.forEach((li) => {
        expect(li.getAttribute('tabindex')).to.equal('-1');
      });
    });

    it('sets aria-selected=false on all items (focus is tracked via aria-activedescendant)', async () => {
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${mockItems}"></cds-aichat-autocomplete>
      `);

      const options = el.shadowRoot?.querySelectorAll('li[role="option"]');
      options?.forEach((option) => {
        expect((option as HTMLElement).getAttribute('aria-selected')).to.equal(
          'false'
        );
      });
    });

    it('adds active class and updates aria-activedescendant when item is focused', async () => {
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${mockItems}"></cds-aichat-autocomplete>
      `);

      // First item is auto-focused on render
      const firstOption = el.shadowRoot?.querySelector('li[role="option"]');
      expect(
        firstOption?.classList.contains('cds-aichat-autocomplete-item--active')
      ).to.be.true;

      const listbox = el.shadowRoot?.querySelector('[role="listbox"]');
      expect(listbox?.getAttribute('aria-activedescendant')).to.equal(
        '1--option'
      );
    });

    it('displays input text in bold when label starts with typed text', async () => {
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${mockItems}"
          input-text="Hello"></cds-aichat-autocomplete>
      `);

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

      // First group item should be auto-focused on render
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
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${mockItems}"
          .groups="${mockGroups}"></cds-aichat-autocomplete>
      `);

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
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${mockItems}"
          .groups="${mockGroups}"></cds-aichat-autocomplete>
      `);

      // First item is already focused, navigate down 2 more times to reach first group item
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

      const allOptions = el.shadowRoot?.querySelectorAll('li[role="option"]');
      const activeOption = Array.from(allOptions || []).find((li) =>
        li.classList.contains('cds-aichat-autocomplete-item--active')
      );

      expect(activeOption?.textContent).to.include('Group item 1');
    });
  });

  describe('header', () => {
    it('should render header when headerConfig.showHeader is true', async () => {
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${mockItems}"
          .headerConfig="${{
            showHeader: true,
            title: 'Test Header',
          }}"></cds-aichat-autocomplete>
      `);

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
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${mockItems}"
          .headerConfig="${{
            showHeader: false,
            title: 'Test Header',
          }}"></cds-aichat-autocomplete>
      `);

      const header = el.shadowRoot?.querySelector(
        '.cds-aichat-autocomplete__header'
      );
      expect(header).to.not.exist;
    });
  });

  describe('events', () => {
    it('should emit send event when item is clicked (label falls back when no value)', async () => {
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${mockItems}"></cds-aichat-autocomplete>
      `);

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
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${[itemWithValue]}"></cds-aichat-autocomplete>
      `);

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
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${mockItems}"></cds-aichat-autocomplete>
      `);

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
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${mockItems}"
          .disableDirectSend="${true}"></cds-aichat-autocomplete>
      `);

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
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${mockItems}"></cds-aichat-autocomplete>
      `);

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
  });

  describe('keyboard navigation', () => {
    it('responds to a synthetic ArrowDown dispatched directly on the element (controller forwarding path)', async () => {
      // The autocomplete-controller dispatches a synthetic KeyboardEvent directly
      // on the registered list element. Verify the element handles it identically
      // to a user-initiated keydown so the custom-list code path works.
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${mockItems}"></cds-aichat-autocomplete>
      `);

      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
          cancelable: true,
        })
      );
      await el.updateComplete;

      const listbox = el.shadowRoot?.querySelector('[role="listbox"]');
      expect(listbox?.getAttribute('aria-activedescendant')).to.equal(
        '2--option'
      );
    });

    it('should move focus down with ArrowDown', async () => {
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${mockItems}"></cds-aichat-autocomplete>
      `);

      const options = el.shadowRoot?.querySelectorAll('li[role="option"]');
      // First item is auto-focused on render
      expect(
        (options?.[0] as HTMLElement)?.classList.contains(
          'cds-aichat-autocomplete-item--active'
        )
      ).to.be.true;

      // Move down to second item
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
        '2--option'
      );
    });

    it('should move focus up with ArrowUp', async () => {
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${mockItems}"></cds-aichat-autocomplete>
      `);

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
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${mockItems}"
          .groups="${mockGroups}"></cds-aichat-autocomplete>
      `);

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
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${mockItems}"
          .groups="${mockGroups}"></cds-aichat-autocomplete>
      `);

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

    it('should send item with Enter key', async () => {
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${mockItems}"></cds-aichat-autocomplete>
      `);

      let eventDetail: any = null;
      el.addEventListener('cds-aichat-autocomplete-send', (e: Event) => {
        eventDetail = (e as CustomEvent).detail;
      });

      // First item is already focused, pressing Enter sends it
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
  });

  describe('hover navigation', () => {
    it('mouseenter on a non-active row makes it the active option', async () => {
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${mockItems}"></cds-aichat-autocomplete>
      `);

      // First item is auto-focused on render
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
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${mockItems}"></cds-aichat-autocomplete>
      `);

      const listbox = el.shadowRoot?.querySelector('[role="listbox"]');
      const options = el.shadowRoot?.querySelectorAll('li[role="option"]');

      // First item is the initial active option
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
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${mockItems}"></cds-aichat-autocomplete>
      `);

      let sentText: string | null = null;
      el.addEventListener('cds-aichat-autocomplete-send', (e: Event) => {
        sentText = (e as CustomEvent<{ text: string }>).detail.text;
      });

      const options = el.shadowRoot?.querySelectorAll('li[role="option"]');

      // Hover the second item while the first is active
      (options?.[1] as HTMLElement)?.dispatchEvent(
        new MouseEvent('mouseenter', { bubbles: true })
      );
      await el.updateComplete;

      // Enter should pick the hovered (now active) second item
      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;

      expect(sentText).to.equal(mockItems[1].label);
    });

    it('mouseenter on a disabled item does not move the active option', async () => {
      const disabledItem = {
        id: 'disabled-1',
        label: 'Disabled',
        disabled: true,
      };
      const enabledItem = { id: 'enabled-1', label: 'Enabled' };
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${[enabledItem, disabledItem]}"></cds-aichat-autocomplete>
      `);

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
    it('should have aria-activedescendant pointing to focused item', async () => {
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${mockItems}"></cds-aichat-autocomplete>
      `);

      // First item is auto-focused
      const listbox = el.shadowRoot?.querySelector('[role="listbox"]');
      const activeId = listbox?.getAttribute('aria-activedescendant');
      expect(activeId).to.equal('1--option');
    });

    it('should have aria-activedescendant for grouped items', async () => {
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${mockItems}"
          .groups="${mockGroups}"></cds-aichat-autocomplete>
      `);

      // First item is auto-focused (index 0), navigate down 2 times to reach group item at index 2
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
      const activeId = listbox?.getAttribute('aria-activedescendant');
      expect(activeId).to.equal('3--option');
    });

    it('should have role=listbox on the main list', async () => {
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${mockItems}"></cds-aichat-autocomplete>
      `);

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
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${mockItems}"
          input-text="Hello"></cds-aichat-autocomplete>
      `);

      expect(el.inputText).to.equal('Hello');
      const typedSpan = el.shadowRoot?.querySelector(
        '.cds-aichat-autocomplete-item__label-typed'
      );
      expect(typedSpan?.textContent).to.equal('Hello');
    });

    it('should render with attached property', async () => {
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${mockItems}"
          .attached="${false}"></cds-aichat-autocomplete>
      `);

      expect(el.attached).to.be.false;
    });

    it('disableDirectSend defaults to false', async () => {
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${mockItems}"></cds-aichat-autocomplete>
      `);

      expect(el.disableDirectSend).to.be.false;
    });

    it('disableDirectSend can be set to true', async () => {
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${mockItems}"
          .disableDirectSend="${true}"></cds-aichat-autocomplete>
      `);

      expect(el.disableDirectSend).to.be.true;
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
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${[disabledItem, enabledItem]}"></cds-aichat-autocomplete>
      `);

      const options = el.shadowRoot?.querySelectorAll('li[role="option"]');

      expect(
        (options?.[0] as HTMLElement)?.getAttribute('aria-disabled')
      ).to.equal('true');
      expect(
        (options?.[1] as HTMLElement)?.getAttribute('aria-disabled')
      ).to.equal('false');
    });

    it('should add the disabled class', async () => {
      const el = await fixture<AutocompleteElement>(
        html` <cds-aichat-autocomplete
          .items="${[disabledItem]}"></cds-aichat-autocomplete>`
      );

      const options = el.shadowRoot?.querySelectorAll('li[role="option"]');
      const disabledClass = `${prefix}-autocomplete-item--disabled`;

      expect((options?.[0] as HTMLElement).classList.contains(disabledClass)).to
        .be.true;
    });

    it('click on disabled item does not fire cds-aichat-autocomplete-send (disableDirectSend=false)', async () => {
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${[disabledItem, enabledItem]}"></cds-aichat-autocomplete>
      `);

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
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${[disabledItem, enabledItem]}"
          .disableDirectSend="${true}"></cds-aichat-autocomplete>
      `);

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
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${[disabledItem]}"></cds-aichat-autocomplete>
      `);

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
      const threeItems: SuggestionItem[] = [
        enabledItem,
        disabledItem,
        { id: 'enabled-2', label: 'Enabled Option 2' },
      ];
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${threeItems}"></cds-aichat-autocomplete>
      `);

      // Focus starts at index 0 (first enabled). One ArrowDown should skip
      // the disabled item at index 1 and land on index 2.
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
      // Layout: enabled(0) → disabled(1). From 0, ArrowDown should not move.
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${[enabledItem, disabledItem]}"></cds-aichat-autocomplete>
      `);

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

    it('initial focus skips a leading disabled item', async () => {
      // Render with disabled first — _focusedIndex should initialise to the
      // first enabled item, not index 0.
      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${[disabledItem, enabledItem]}"></cds-aichat-autocomplete>
      `);

      const listbox = el.shadowRoot?.querySelector('[role="listbox"]');
      // Initial focus should be on the first enabled item (index 1, id 'enabled-1')
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

      const el = await fixture<AutocompleteElement>(html`
        <cds-aichat-autocomplete
          .items="${mockItems}"
          .groups="${mockGroups}"
          .i18n="${trackingI18n}"></cds-aichat-autocomplete>
      `);

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
      await new Promise((resolve) => window.setTimeout(resolve, 75));

      expect(announcedMessage).to.equal('Group item 1, Group 1, 3 of 4');
    });
  });
});
