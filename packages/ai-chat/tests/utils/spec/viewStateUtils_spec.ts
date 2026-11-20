/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { constructViewState } from '../../../src/chat/utils/viewStateUtils';

describe('viewStateUtils', () => {
  const baseState = {
    view: {
      persistedToBrowserStorage: {
        viewState: {
          launcher: false,
          mainWindow: true,
        },
      },
    },
  } as any;

  it('merges partial view state', () => {
    const result = constructViewState({ launcher: true }, baseState);
    expect(result.launcher).toBe(true);
    expect(result.mainWindow).toBe(true);
  });
});
