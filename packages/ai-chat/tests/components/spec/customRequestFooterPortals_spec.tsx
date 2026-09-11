/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The footer slot below a user message is opt-in through `renderCustomRequestFooter`. The case that matters most
 * here is the one the whole design exists to prevent: a host already passing `renderCustomMessageFooter` must not
 * start getting footers on user messages. That host passes no outbound callback, so the container must render
 * nothing even while outbound slot events are arriving.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { CustomRequestFooterPortalsContainer } from '../../../src/chat/components/portals/CustomRequestFooterPortalsContainer';
import { ChatInstance } from '../../../src/types/instance/ChatInstance';
import {
  MessageInputType,
  MessageRequest,
} from '../../../src/types/messaging/Messages';

const chatInstance = {} as ChatInstance;

const createRequest = (text: string): MessageRequest => ({
  id: `msg-${text}`,
  input: {
    message_type: MessageInputType.TEXT,
    text,
  },
});

const slotState = (slotName: string, text: string) => ({
  slotName,
  message: createRequest(text),
});

describe('CustomRequestFooterPortalsContainer', () => {
  it('renders returned content for a sent message', () => {
    const chatWrapper = document.createElement('div');
    document.body.appendChild(chatWrapper);

    render(
      <CustomRequestFooterPortalsContainer
        chatInstance={chatInstance}
        renderCustomRequestFooter={(slotName, message) => (
          <button type="button">Copy {message.input.text}</button>
        )}
        customRequestFooterEventsBySlot={{
          'request-footer-1': slotState('request-footer-1', 'hello'),
        }}
        chatWrapper={chatWrapper}
      />
    );

    const host = chatWrapper.querySelector('[slot="request-footer-1"]');
    expect(host).not.toBeNull();
    expect(host.textContent).toBe('Copy hello');
  });

  it('gives incoming-only hosts no outbound footer', () => {
    const chatWrapper = document.createElement('div');
    document.body.appendChild(chatWrapper);

    render(
      <CustomRequestFooterPortalsContainer
        chatInstance={chatInstance}
        renderCustomRequestFooter={undefined}
        customRequestFooterEventsBySlot={{
          'request-footer-1': slotState('request-footer-1', 'hello'),
        }}
        chatWrapper={chatWrapper}
      />
    );

    expect(chatWrapper.querySelector('[slot="request-footer-1"]')).toBeNull();
    expect(chatWrapper.children).toHaveLength(0);
  });

  it('creates no host element when the callback returns null', () => {
    const chatWrapper = document.createElement('div');
    document.body.appendChild(chatWrapper);

    render(
      <CustomRequestFooterPortalsContainer
        chatInstance={chatInstance}
        renderCustomRequestFooter={() => null}
        customRequestFooterEventsBySlot={{
          'request-footer-1': slotState('request-footer-1', 'hello'),
        }}
        chatWrapper={chatWrapper}
      />
    );

    // An empty host element would still pick up the slotted margin and leave a
    // gap under the bubble, so nothing is created at all.
    expect(chatWrapper.querySelector('[slot="request-footer-1"]')).toBeNull();
    expect(chatWrapper.children).toHaveLength(0);
  });

  it('removes the host element when the callback starts returning null', () => {
    const chatWrapper = document.createElement('div');
    document.body.appendChild(chatWrapper);

    const { rerender } = render(
      <CustomRequestFooterPortalsContainer
        chatInstance={chatInstance}
        renderCustomRequestFooter={() => <span>footer</span>}
        customRequestFooterEventsBySlot={{
          'request-footer-1': slotState('request-footer-1', 'hello'),
        }}
        chatWrapper={chatWrapper}
      />
    );
    expect(
      chatWrapper.querySelector('[slot="request-footer-1"]')
    ).not.toBeNull();

    rerender(
      <CustomRequestFooterPortalsContainer
        chatInstance={chatInstance}
        renderCustomRequestFooter={() => null}
        customRequestFooterEventsBySlot={{
          'request-footer-1': slotState('request-footer-1', 'hello'),
        }}
        chatWrapper={chatWrapper}
      />
    );

    expect(chatWrapper.querySelector('[slot="request-footer-1"]')).toBeNull();
  });

  it('passes the submitted message to the callback', () => {
    const chatWrapper = document.createElement('div');
    document.body.appendChild(chatWrapper);
    const renderCustomRequestFooter = jest.fn().mockReturnValue(null);

    render(
      <CustomRequestFooterPortalsContainer
        chatInstance={chatInstance}
        renderCustomRequestFooter={renderCustomRequestFooter}
        customRequestFooterEventsBySlot={{
          'request-footer-1': slotState('request-footer-1', 'hello'),
        }}
        chatWrapper={chatWrapper}
      />
    );

    expect(renderCustomRequestFooter).toHaveBeenCalledTimes(1);
    const [slotName, message, instance] =
      renderCustomRequestFooter.mock.calls[0];
    expect(slotName).toBe('request-footer-1');
    expect(message.input.text).toBe('hello');
    expect(instance).toBe(chatInstance);
    expect(renderCustomRequestFooter.mock.calls[0]).toHaveLength(3);
  });

  it('removes the host element for a slot that left state', () => {
    const chatWrapper = document.createElement('div');
    document.body.appendChild(chatWrapper);

    const { rerender } = render(
      <CustomRequestFooterPortalsContainer
        chatInstance={chatInstance}
        renderCustomRequestFooter={() => <span>footer</span>}
        customRequestFooterEventsBySlot={{
          'request-footer-1': slotState('request-footer-1', 'hello'),
        }}
        chatWrapper={chatWrapper}
      />
    );
    expect(
      chatWrapper.querySelector('[slot="request-footer-1"]')
    ).not.toBeNull();

    rerender(
      <CustomRequestFooterPortalsContainer
        chatInstance={chatInstance}
        renderCustomRequestFooter={() => <span>footer</span>}
        customRequestFooterEventsBySlot={{}}
        chatWrapper={chatWrapper}
      />
    );

    expect(chatWrapper.querySelector('[slot="request-footer-1"]')).toBeNull();
  });
});
