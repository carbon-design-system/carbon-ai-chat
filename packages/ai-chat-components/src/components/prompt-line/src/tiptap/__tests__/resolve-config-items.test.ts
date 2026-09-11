/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect } from '@open-wc/testing';

import { resolveConfigItems } from '../resolve-config-items.js';
import type { SuggestionItem } from '../types.js';

const ITEMS: SuggestionItem[] = [
  { id: '1', label: 'Alice' },
  { id: '2', label: 'Bob' },
  { id: '3', label: 'Carol' },
];

describe('tiptap/resolveConfigItems', () => {
  it('returns [] when query is shorter than minQueryLength', async () => {
    const result = await resolveConfigItems(
      { items: ITEMS, minQueryLength: 3 },
      'al'
    );
    expect(result).to.deep.equal([]);
  });

  it('calls through when query meets minQueryLength exactly', async () => {
    const result = await resolveConfigItems(
      { items: ITEMS, minQueryLength: 3 },
      'ali'
    );
    expect(result).to.deep.equal([{ id: '1', label: 'Alice' }]);
  });

  it('returns all items when query is empty and items is an array', async () => {
    const result = await resolveConfigItems({ items: ITEMS }, '');
    expect(result).to.deep.equal(ITEMS);
  });

  it('filters items by case-insensitive substring when query is non-empty', async () => {
    const result = await resolveConfigItems({ items: ITEMS }, 'o');
    expect(result).to.deep.equal([
      { id: '2', label: 'Bob' },
      { id: '3', label: 'Carol' },
    ]);
  });

  it('delegates to an async resolver function and awaits it', async () => {
    const asyncResolver = async (query: string): Promise<SuggestionItem[]> =>
      ITEMS.filter((i) => i.label.toLowerCase().startsWith(query));
    const result = await resolveConfigItems({ items: asyncResolver }, 'a');
    expect(result).to.deep.equal([{ id: '1', label: 'Alice' }]);
  });

  it('delegates to a sync resolver function via Promise.resolve', async () => {
    const syncResolver = (query: string): SuggestionItem[] =>
      ITEMS.filter((i) => i.label.toLowerCase().startsWith(query));
    const result = await resolveConfigItems({ items: syncResolver }, 'b');
    expect(result).to.deep.equal([{ id: '2', label: 'Bob' }]);
  });

  it('passes the exact query string to the resolver', async () => {
    let received: string | undefined;
    const capture = (query: string): SuggestionItem[] => {
      received = query;
      return [];
    };
    await resolveConfigItems({ items: capture }, 'ExActQuery');
    expect(received).to.equal('ExActQuery');
  });
});
