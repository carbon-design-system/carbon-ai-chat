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
import { chatMountStateContext } from '../../../src/web-components/shared/chat-mount-state-context';
import type { ChatMountState } from '../../../src/chat/services/chatMountState';
import enLanguagePack from '../../../src/languages/en.json';
import { answerPrompt, openPrompt } from '../../../src/chat/state';
import { chatStore } from '../../../src/chat/services/attachChatView';
import {
  createBaseConfig,
  getChatHost,
  getChatShadowRoot,
} from '../../test_helpers';

class ViewStateProbe extends LitElement {
  viewState = new ContextConsumer(this, { context: chatMountStateContext });
}
customElements.define('test-end-chat-view-state-probe', ViewStateProbe);

function viewStateOf(host: Element): ChatMountState {
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

it("opens the end-chat panel from the chat's prompt, and a card's prompt wins", async () => {
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

  const store = chatStore(viewState.serviceManager);
  act(() => {
    openPrompt(store, { kind: 'endChat' }, { onConfirm: jest.fn() });
  });
  await waitFor(() => expect(endChatPanel()).toEqual([defaultTitle]));
  const endChatId = store.getState().view.prompt.id;

  let release: () => void;
  act(() => {
    release = openPrompt(
      store,
      {
        kind: 'humanAgent',
        title: 'Finish support',
        message: 'Leave this conversation?',
      },
      { onConfirm: jest.fn(), onCancel: jest.fn() }
    );
  });
  await waitFor(() => expect(endChatPanel()).toEqual(['Finish support']));

  act(() => release());
  await waitFor(() => expect(endChatPanel()).toEqual([defaultTitle]));

  act(() => answerPrompt(store, endChatId, 'cancel'));
  await waitFor(() => expect(endChatPanel()).toEqual([]));
}, 20000);
