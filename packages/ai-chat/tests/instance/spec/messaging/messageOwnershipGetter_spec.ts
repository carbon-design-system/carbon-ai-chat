/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act } from '@testing-library/react';
import type { MessageResponse } from '../../../../src/types/messaging/Messages';
import { MessageResponseTypes } from '../../../../src/types/messaging/Messages';
import type { ServiceManager } from '../../../../src/sdk/services/ServiceManager';
import { addMessages } from '../../../../src/sdk/services/haa/humanAgentUtils';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupBeforeEach,
  setupAfterEach,
} from '../../../test_helpers';

beforeEach(setupBeforeEach);
afterEach(setupAfterEach);

it.each([false, true])(
  'preserves inherited ID access when publishing a received copy, existing HAA ownership=%s',
  async (hasHumanAgentMessage) => {
    const { instance, store, serviceManager } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    if (hasHumanAgentMessage) {
      const message: MessageResponse = {
        id: 'unrelated-agent',
        history: {},
        output: {
          generic: [
            { response_type: MessageResponseTypes.TEXT, text: 'Agent' },
          ],
        },
      };
      await act(async () => {
        await addMessages(
          [
            {
              originalMessage: message,
              localMessages: [
                {
                  fullMessageID: message.id,
                  item: message.output.generic[0],
                  ui_state: { id: 'unrelated-agent-local' },
                },
              ],
            },
          ],
          true,
          serviceManager as ServiceManager
        );
      });
    }
    const failure = new Error('post-commit inherited ID getter');
    const error = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    class Response {
      output: MessageResponse['output'] = { generic: [] };
      get id() {
        if (store.getState().allMessagesByID['inherited-id'] === this) {
          throw failure;
        }
        return 'inherited-id';
      }
    }
    const response = new Response();
    try {
      await act(async () => {
        await instance.messaging.addMessage(response);
      });
      const stored = store.getState().allMessagesByID['inherited-id'];
      expect(stored).toBeInstanceOf(Response);
      expect(stored).not.toBe(response);
      expect(
        error.mock.calls.filter(([message]) =>
          String(message).includes('Error processing the message response')
        )
      ).toEqual([]);
      if (hasHumanAgentMessage) {
        expect(
          store.getState().allMessagesByID['unrelated-agent']
        ).toBeDefined();
      }
    } finally {
      error.mockRestore();
    }
  }
);
