/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act } from '@testing-library/react';
import { ChatMountState } from '../../../../src/chat/services/chatMountState';
import { resolvablePromise } from '../../../../src/sdk/utils/resolvablePromise';
import { BusEventType } from '../../../../src/types/events/eventBusTypes';
import { MessageResponseTypes } from '../../../../src/types/messaging/Messages';
import type { MainWindowFunctions } from '../../../../src/types/utilities/MainWindowFunctions';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../../test_helpers';

beforeEach(setupBeforeEach);
afterEach(setupAfterEach);

it.each(['replacement', 'missing'])(
  'restores history scroll through the current boot capability after replay: %s handle',
  async (mode) => {
    const boot = await renderChatAndGetInstanceWithStore(createBaseConfig());
    // The shell publishes the main window handle on the view state; swap what
    // that getter returns, so the real view bindings read the replacement.
    const shellMainWindow = Object.getOwnPropertyDescriptor(
      ChatMountState.prototype,
      'mainWindow'
    )!.get!;
    let replace = (
      handle: MainWindowFunctions | undefined
    ): MainWindowFunctions | undefined => handle;
    const mainWindow = jest
      .spyOn(ChatMountState.prototype, 'mainWindow', 'get')
      .mockImplementation(function (this: ChatMountState) {
        return replace(shellMainWindow.call(this));
      });
    const oldRestore = jest.fn();
    const capture = jest.fn(() => 71);
    replace = (handle) => ({
      ...handle!,
      getMessagesScrollBottom: capture,
      doAutoScroll: oldRestore,
    });
    const entered = resolvablePromise<void>();
    const release = resolvablePromise<void>();
    const trace: string[] = [];
    boot.instance.on({
      type: BusEventType.CUSTOM_FOOTER_SLOT,
      handler: async () => {
        trace.push('footer:start');
        entered.doResolve();
        await release;
        trace.push('footer:end');
      },
    });
    let settled = false;
    let work: Promise<void>;
    try {
      await act(async () => {
        work = boot.instance.messaging
          .insertHistory([
            {
              time: new Date().toISOString(),
              message: {
                id: 'history-scroll',
                output: {
                  generic: [
                    {
                      response_type: MessageResponseTypes.TEXT,
                      text: 'Restored response',
                      message_item_options: {
                        custom_footer_slot: {
                          is_on: true,
                          slot_name: 'history-scroll-footer',
                        },
                      },
                    },
                  ],
                },
              },
            },
          ])
          .then(() => {
            settled = true;
          });
        await entered;
      });
      expect(capture).toHaveBeenCalled();
      expect(trace).toEqual(['footer:start']);
      expect(settled).toBe(false);
      const newRestore = jest.fn();
      replace =
        mode === 'replacement'
          ? (handle) => ({
              ...handle!,
              getMessagesScrollBottom: () => 99,
              doAutoScroll: newRestore,
            })
          : () => undefined;
      await act(async () => {
        release.doResolve();
        await work;
      });
      expect(trace).toEqual(['footer:start', 'footer:end']);
      expect(settled).toBe(true);
      expect(
        boot.store.getState().allMessagesByID['history-scroll']
      ).toBeDefined();
      expect(oldRestore).not.toHaveBeenCalledWith({ scrollToBottom: 71 });
      if (mode === 'replacement') {
        expect(newRestore).toHaveBeenCalledWith({ scrollToBottom: 71 });
      } else {
        expect(newRestore).not.toHaveBeenCalled();
      }
    } finally {
      await act(async () => {
        release.doResolve();
        await work;
      });
      mainWindow.mockRestore();
    }
  }
);
