/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The paths `findDrawIssues` lists decide which upserted items the chat skips
 * instead of drawing. Contract tests cover a few shapes through
 * `upsertMessage`; this matrix covers every shape the check walks, which would
 * take a mounted chat per case through the public surface.
 */

import {
  createLocalMessageItemsForNestedMessageItems,
  findDrawIssues,
  outputItemToLocalItem,
} from '../outputItemToLocalItem';
import { LocalMessageItem } from '../../../types/messaging/LocalMessageItem';
import {
  GenericItem,
  MessageResponse,
} from '../../../types/messaging/Messages';

interface DrawFixture {
  name: string;
  item: unknown;
  missing: string[];
}

const text = (value = 'Hello') => ({ response_type: 'text', text: value });
const card = (extra: Record<string, unknown> = {}) => ({
  response_type: 'card',
  body: [text('Card body')],
  ...extra,
});
const grid = (rows: unknown, extra: Record<string, unknown> = {}) => ({
  response_type: 'grid',
  rows,
  ...extra,
});
const cellOf = (items: unknown) => ({ cells: [{ items }] });
const showPanelButton = (panel: Record<string, unknown>) => ({
  response_type: 'button',
  button_type: 'show_panel',
  label: 'Open',
  panel: { title: 'Panel', ...panel },
});
const option = (value: string) => ({
  label: value,
  value: { input: { text: value } },
});

/** Items the chat can't draw. */
const MALFORMED: DrawFixture[] = [
  {
    name: 'carousel, null entry',
    item: { response_type: 'carousel', items: [null] },
    missing: ['items[0]'],
  },
  { name: 'grid, null row', item: grid([null]), missing: ['rows[0]'] },
  {
    name: 'grid, row with no cells',
    item: grid([{}]),
    missing: ['rows[0].cells'],
  },
  {
    name: 'grid, null cell',
    item: grid([{ cells: [null] }]),
    missing: ['rows[0].cells[0]'],
  },
  {
    name: 'grid, column width not a string',
    item: grid([cellOf([text()])], { columns: [{ width: 2 }] }),
    missing: ['columns[0].width'],
  },
  {
    name: 'option, no options',
    item: { response_type: 'option', title: 'Pick one' },
    missing: ['options'],
  },
  {
    name: 'option, null entry',
    item: { response_type: 'option', title: 'Pick one', options: [null] },
    missing: ['options[0]'],
  },
  {
    name: 'option, dropdown entry with no value.input',
    item: {
      response_type: 'option',
      title: 'Pick one',
      preference: 'dropdown',
      options: [{ label: 'One' }],
    },
    missing: ['options[0].value.input'],
  },
  {
    name: 'option, more than four entries, one with no value',
    item: {
      response_type: 'option',
      title: 'Pick one',
      options: [
        option('One'),
        option('Two'),
        option('Three'),
        option('Four'),
        { label: 'Five' },
      ],
    },
    missing: ['options[4].value.input'],
  },
  {
    name: 'conversational_search, citations not a list',
    item: {
      response_type: 'conversational_search',
      text: 'Answer',
      citations: 'Cited',
    },
    missing: ['citations'],
  },
  {
    name: 'conversational_search, null citation',
    item: {
      response_type: 'conversational_search',
      text: 'Answer',
      citations: [null],
    },
    missing: ['citations[0]'],
  },
];

/** Items the chat draws today, though some lack fields their types call required. */
const LOOSE: DrawFixture[] = [
  {
    // The rowless grid would be listed if the check walked the footer entry.
    name: 'card, unsupported footer item',
    item: card({ footer: [grid(undefined)] }),
    missing: [],
  },
  {
    name: 'option, button-mode entries with no value',
    item: {
      response_type: 'option',
      title: 'Pick one',
      options: [{ label: 'One' }, { label: 'Two' }],
    },
    missing: [],
  },
  {
    name: 'conversational_search, empty citations',
    item: {
      response_type: 'conversational_search',
      text: 'Answer',
      citations: '',
    },
    missing: [],
  },
];

const issuesOf = (fixture: DrawFixture) =>
  findDrawIssues(fixture.item as GenericItem);

describe('findDrawIssues', () => {
  it.each(MALFORMED)('lists what "$name" is missing', (fixture) => {
    expect(issuesOf(fixture)).toEqual(fixture.missing);
  });

  it.each(LOOSE)('lists nothing for "$name"', (fixture) => {
    expect(issuesOf(fixture)).toEqual([]);
  });

  it('lists every path an item is missing, nested ones prefixed', () => {
    expect(
      issuesOf({
        name: 'card with two broken entries',
        item: {
          response_type: 'card',
          body: [
            null,
            { response_type: 'grid', rows: [{ cells: [{ items: 'x' }] }] },
          ],
          footer: 'Footer',
        },
        missing: [],
      })
    ).toEqual(['body[0]', 'body[1].rows[0].cells[0].items', 'footer']);
  });

  it('checks only the columns that have a cell', () => {
    expect(
      issuesOf({
        name: 'grid with an extra column',
        item: {
          response_type: 'grid',
          rows: [{ cells: [{ items: [] }] }],
          columns: [{ width: '1' }, { width: 2 }],
        },
        missing: [],
      })
    ).toEqual([]);
  });
});

describe('createLocalMessageItemsForNestedMessageItems', () => {
  it('builds no footer for a card nested in a panel', () => {
    const item = showPanelButton({
      body: [card({ footer: [text('Footer')] })],
    }) as GenericItem;
    const message = {
      id: 'panel-message',
      output: { generic: [item] },
    } as MessageResponse;
    const localItem = outputItemToLocalItem(item, message);
    const nested: LocalMessageItem[] = [];

    createLocalMessageItemsForNestedMessageItems(
      localItem,
      message,
      false,
      nested,
      true
    );

    const [panelCard] = nested;
    expect(localItem.ui_state.bodyLocalMessageItemIDs).toEqual([
      panelCard.ui_state.id,
    ]);
    expect(panelCard.item.response_type).toBe('card');
    expect(panelCard.ui_state.bodyLocalMessageItemIDs).toHaveLength(1);
    expect(panelCard.ui_state.footerLocalMessageItemIDs).toBeUndefined();
    expect(nested).toHaveLength(2);
  });
});
