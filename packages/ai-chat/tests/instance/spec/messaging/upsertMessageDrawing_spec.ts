/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { setupBeforeEach, setupAfterEach } from '../../../test_helpers';
import { MessageState } from '../../../../src/types/config/MessagingConfig';
import {
  LOOSE,
  MESSAGE_ID,
  fixtureMessage,
  observeWrite,
} from '../../../utils/itemDrawabilityFixtures';

describe('ChatInstance.messaging.upsertMessage item drawing', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  const draws = {
    rejects: false,
    shownItems: 1,
    reports: [] as string[],
    failedItems: 0,
    catastrophic: false,
  };

  describe.each([MessageState.STREAMING, MessageState.COMPLETE])(
    'as %s',
    (state) => {
      it.each(LOOSE)('draws "$name"', async (fixture) => {
        const outcome = await observeWrite((instance) =>
          instance.messaging.upsertMessage(MESSAGE_ID, state, () =>
            fixtureMessage(fixture)
          )
        );
        expect(outcome).toEqual(draws);
      });
    }
  );
});
