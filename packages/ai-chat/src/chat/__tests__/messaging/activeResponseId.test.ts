/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { waitFor } from '@testing-library/react';
import { MessageResponseTypes } from '../../../types/messaging/Messages';
import actions from '../../../sdk/store/actions';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../helpers/chat';

describe('activeResponseId public state', () => {
  beforeEach(() => {
    setupBeforeEach();
  });

  afterEach(() => {
    setupAfterEach();
  });

  it('sets the active response from hydrated history and clears on restart', async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    await instance.messaging.insertHistory([
      {
        message: {
          id: 'hist-1',
          output: {
            generic: [
              { response_type: MessageResponseTypes.TEXT, text: 'one' },
            ],
          },
        } as any,
        time: new Date(Date.now() - 2).toISOString(),
      },
      {
        message: {
          id: 'hist-2',
          output: {
            generic: [
              { response_type: MessageResponseTypes.TEXT, text: 'two' },
            ],
          },
        } as any,
        time: new Date(Date.now() - 1).toISOString(),
      },
    ]);

    await waitFor(() =>
      expect(instance.getState().activeResponseId).toBe('hist-2')
    );

    store.dispatch(actions.restartConversation());
    expect(instance.getState().activeResponseId).toBeNull();
  });
});
