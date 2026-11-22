/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act } from '@testing-library/react';
import { BusEventType } from '../../types/events/eventBusTypes';
import { MessageRequest } from '../../types/messaging/Messages';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupBeforeEach,
  setupAfterEach,
} from '../../chat/__tests__/helpers/chat';

describe('existing host ownership contracts', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('keeps request footer wrappers writable while their message stays frozen', async () => {
    const { instance } = await renderChatAndGetInstanceWithStore({
      ...createBaseConfig(),
      messaging: {
        skipWelcome: true,
        customSendMessage: async () => undefined,
      },
    });
    let wrapperFrozen: boolean;
    let messageFrozen: boolean;
    instance.on({
      type: BusEventType.CUSTOM_REQUEST_FOOTER_SLOT,
      handler: (event: any) => {
        wrapperFrozen = Object.isFrozen(event.data);
        messageFrozen = Object.isFrozen(event.data.message);
      },
    });
    const request: MessageRequest = {
      input: { text: 'footer' },
      message_options: { custom_request_footer_slot: { is_on: true } },
    } as MessageRequest;
    await act(async () => instance.send(request));
    expect(wrapperFrozen).toBe(false);
    expect(messageFrozen).toBe(true);
  });
});
