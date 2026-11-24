/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { StrictMode, useEffect } from 'react';
import { render, waitFor } from '@testing-library/react';

import '../../../src/web-components/cds-aichat-container';
import { useChatViewStateInstance } from '../../../src/chat/hooks/useChatViewState';
import type { ChatViewState } from '../../../src/chat/services/chatViewState';
import { ChatContainer } from '../../../src/react/ChatContainer';
import { ChatInstance } from '../../../src/types/instance/ChatInstance';
import { MessageResponseTypes } from '../../../src/types/messaging/Messages';
import {
  createBaseConfig,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

describe('public APIs in extension content first effects', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it.each([false, true])(
    'delegates before consumer passive effects and releases handles on unmount (StrictMode: %s)',
    async (strict) => {
      let instance: ChatInstance;
      let handles: ChatViewState;
      const calls: Record<string, unknown[]> = { response: [], writeable: [] };
      function Consumer({ id }: { id: string }) {
        // The shell publishes its handles to the mount's view state.
        const viewState = useChatViewStateInstance();
        useEffect(() => {
          handles = viewState;
          const scroll =
            viewState.mainWindow &&
            jest.spyOn(viewState.mainWindow, 'doScrollToMessage');
          const autoScroll =
            viewState.mainWindow &&
            jest.spyOn(viewState.mainWindow, 'doAutoScroll');
          const focus =
            viewState.appWindow &&
            jest.spyOn(viewState.appWindow, 'requestFocus');
          instance.scrollToMessage('restored', false);
          instance.doAutoScroll();
          instance.requestFocus();
          calls[id].push({
            scroll: scroll?.mock.calls.length ?? 0,
            autoScroll: autoScroll?.mock.calls.length ?? 0,
            focus: focus?.mock.calls.length ?? 0,
            announcer: typeof viewState.ariaAnnouncer,
          });
          scroll?.mockRestore();
          autoScroll?.mockRestore();
          focus?.mockRestore();
        }, [id, viewState]);
        return <span />;
      }
      const Wrapper = strict ? StrictMode : React.Fragment;
      const view = render(
        <Wrapper>
          <ChatContainer
            {...createBaseConfig()}
            openChatByDefault
            onBeforeRender={async (chat) => {
              instance = chat;
              await chat.messaging.insertHistory([
                {
                  time: '2026-01-01T00:00:00.000Z',
                  message: {
                    id: 'restored',
                    output: {
                      generic: [
                        {
                          response_type: MessageResponseTypes.USER_DEFINED,
                          user_defined: {},
                        },
                      ],
                    },
                  },
                } as never,
              ]);
            }}
            renderUserDefinedResponse={() => <Consumer id="response" />}
            renderWriteableElements={{
              beforeInputElement: <Consumer id="writeable" />,
            }}
          />
        </Wrapper>
      );
      await waitFor(
        () => {
          expect(calls.response.length).toBeGreaterThan(0);
          expect(calls.writeable.length).toBeGreaterThan(0);
        },
        { timeout: 5000 }
      );
      Object.values(calls)
        .flat()
        .forEach((call) => {
          expect(call).toEqual({
            scroll: 1,
            autoScroll: 1,
            focus: 1,
            announcer: 'function',
          });
        });

      view.unmount();
      await waitFor(() => {
        expect(handles.mainWindow).toBeUndefined();
        expect(handles.appWindow).toBeUndefined();
        expect(handles.ariaAnnouncer).toBeUndefined();
      });
    }
  );
});
