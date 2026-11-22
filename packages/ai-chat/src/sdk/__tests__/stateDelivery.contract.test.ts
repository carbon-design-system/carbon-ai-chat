/**
 * @vitest-environment node
 */

/* eslint jsdoc/check-tag-names: ["error", { "definedTags": ["vitest-environment"] }] */

/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { MessageState } from '../../types/config/MessagingConfig';
import { textResponse, withSDK } from './helpers/publicContract';

describe('SDK public state selections', () => {
  it('recovers from an initial selector error and retires a selection inside its own delivery', async () => {
    await withSDK(async (sdk) => {
      const failure = new Error('Owned initial selector failure');
      expect(() =>
        sdk.state.select(
          () => {
            throw failure;
          },
          (): void => {}
        )
      ).toThrow(failure);
      const selected: number[] = [];
      const continued: number[] = [];
      let unsubscribe = (): void => {};
      unsubscribe = sdk.state.select(
        (state) => state.messages.length,
        (count) => {
          selected.push(count);
          unsubscribe();
        }
      );
      const stopControl = sdk.state.select(
        (state) => state.messages.length,
        (count) => {
          continued.push(count);
        }
      );
      try {
        await sdk.messaging.upsertMessage('first', MessageState.COMPLETE, () =>
          textResponse('first', 'First selection delivery')
        );
        await sdk.messaging.upsertMessage('second', MessageState.COMPLETE, () =>
          textResponse('second', 'A later real delivery')
        );
        expect(selected).toEqual([1]);
        expect(continued).toEqual([1, 2]);
        expect(sdk.state.get().messages.map(({ id }) => id)).toEqual([
          'first',
          'second',
        ]);
      } finally {
        unsubscribe();
        stopControl();
      }
    });
  });
});
