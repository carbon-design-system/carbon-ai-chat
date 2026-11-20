/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { ContextConsumer } from '@lit/context';
import { LitElement } from 'lit';

import '../../../src/web-components/cds-aichat-container';
import { ChatContainer } from '../../../src/react/ChatContainer';
import { chatViewStateContext } from '../../../src/web-components/shared/chat-view-state-context';
import type { ChatViewState } from '../../../src/chat/services/chatViewState';
import enLanguagePack from '../../../src/chat/languages/en.json';
import {
  createBaseConfig,
  getChatHost,
  getChatShadowRoot,
} from '../../test_helpers';

class ViewStateProbe extends LitElement {
  viewState = new ContextConsumer(this, { context: chatViewStateContext });
}
customElements.define('test-end-chat-view-state-probe', ViewStateProbe);

function viewStateOf(host: Element): ChatViewState {
  const probe = document.createElement(
    'test-end-chat-view-state-probe'
  ) as ViewStateProbe;
  host.appendChild(probe);
  const { value } = probe.viewState;
  probe.remove();
  return value;
}

/** The end-chat panel's title and open state, as the booted chat shows them. */
function endChatPanel() {
  const titles = Array.from(
    getChatShadowRoot()?.querySelectorAll<HTMLElement>(
      '.cds-aichat--confirm-panel__title'
    ) ?? []
  );
  const open = titles.filter(
    (title) =>
      (title.closest('cds-aichat-panel') as { open?: boolean } | null)?.open
  );
  return open.map((title) => title.textContent);
}

it('opens the end-chat panel from the chat view state, and a card confirmation wins', async () => {
  const onAfterRender = jest.fn();
  render(
    <ChatContainer
      {...createBaseConfig()}
      openChatByDefault
      onAfterRender={onAfterRender}
    />
  );
  await waitFor(() => expect(onAfterRender).toHaveBeenCalled(), {
    timeout: 8000,
  });
  const viewState = viewStateOf(getChatHost());
  const defaultTitle = enLanguagePack.agent_confirmCancelRequestTitle;
  expect(endChatPanel()).toEqual([]);

  act(() => viewState.showEndChatConfirmation());
  await waitFor(() => expect(endChatPanel()).toEqual([defaultTitle]));

  const release = viewState.openConfirmation({
    title: 'Finish support',
    message: 'Leave this conversation?',
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  });
  await waitFor(() => expect(endChatPanel()).toEqual(['Finish support']));

  act(() => release());
  await waitFor(() => expect(endChatPanel()).toEqual([defaultTitle]));

  act(() => viewState.hideEndChatConfirmation());
  await waitFor(() => expect(endChatPanel()).toEqual([]));
}, 20000);
