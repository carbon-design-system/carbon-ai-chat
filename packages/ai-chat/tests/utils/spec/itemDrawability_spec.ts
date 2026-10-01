/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { findDrawIssues } from '../../../src/chat/schema/outputItemToLocalItem';
import { GenericItem } from '../../../src/types/messaging/Messages';
import {
  DrawFixture,
  LOOSE,
  MALFORMED,
  fixtureMessage,
} from '../../utils/itemDrawabilityFixtures';

const issuesOf = (fixture: DrawFixture) =>
  findDrawIssues(fixture.item as GenericItem, fixtureMessage(fixture));

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

  it('checks a system item only against the items before it', () => {
    expect(
      findDrawIssues({ response_type: 'system' } as GenericItem, {
        id: 'm',
        output: {
          generic: [{ response_type: 'system' }, null] as GenericItem[],
        },
      })
    ).toEqual([]);
  });
});
