/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The footer below a user message is opt-in through `renderCustomRequestFooter`.
 * A host that passes only `renderCustomMessageFooter` must not start getting
 * footers on its user messages, even while outbound slot events arrive. The chat
 * mounts this container only with the callback set, so public tests can't reach
 * its own guard; this keeps the guard from regressing if that mount changes.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { CustomRequestFooterPortalsContainer } from '../CustomRequestFooterPortalsContainer';
import { EventBus } from '../../../../sdk/events/EventBus';
import { ExtensionHosts } from '../../../services/extensionHosts';
import { BusEventType } from '../../../../types/events/eventBusTypes';
import { ChatInstance } from '../../../../types/instance/ChatInstance';
import { MessageInputType } from '../../../../types/messaging/Messages';
import { slotSourceOf } from '../../../__tests__/helpers/chat';

const eventBus = new EventBus();
const chatInstance = eventBus as unknown as ChatInstance;

const connectedHosts: ExtensionHosts[] = [];
afterEach(() => {
  connectedHosts.splice(0).forEach((hosts) => hosts.disconnect());
  document.body.innerHTML = '';
});

/** A connected host service that has recorded one footer per slot. */
function hostsWith(chatWrapper: HTMLElement, slotName: string, text: string) {
  const hosts = new ExtensionHosts(
    slotSourceOf(chatInstance),
    chatWrapper,
    { getState: () => ({ allMessagesByID: {} }), subscribe: () => () => {} },
    () => true
  );
  hosts.connect();
  connectedHosts.push(hosts);
  eventBus.fireSync(
    {
      type: BusEventType.CUSTOM_REQUEST_FOOTER_SLOT,
      data: {
        slotName,
        message: {
          id: `msg-${text}`,
          input: { message_type: MessageInputType.TEXT, text },
        },
      },
    } as never,
    chatInstance
  );
  return hosts;
}

it('gives incoming-only hosts no outbound footer', () => {
  const chatWrapper = document.createElement('div');
  document.body.appendChild(chatWrapper);
  const hosts = hostsWith(chatWrapper, 'request-footer-1', 'hello');

  render(
    <CustomRequestFooterPortalsContainer
      chatInstance={chatInstance}
      renderCustomRequestFooter={undefined}
      hosts={hosts}
    />
  );

  expect(chatWrapper.querySelector('[slot="request-footer-1"]')).toBeNull();
  expect(chatWrapper.children).toHaveLength(0);
});
