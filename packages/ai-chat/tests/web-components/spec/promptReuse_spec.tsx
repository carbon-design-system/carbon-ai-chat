/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * An open confirmation lives in the chat's view state, so it survives a
 * reuse remount, and answering it from the next mount runs the callback it
 * opened with.
 */

import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { ContextConsumer } from '@lit/context';
import { LitElement } from 'lit';

import '../../../src/web-components/cds-aichat-container';
import { ChatContainer } from '../../../src/react/ChatContainer';
import { chatMountStateContext } from '../../../src/web-components/shared/chat-mount-state-context';
import type { ChatMountState } from '../../../src/chat/services/chatMountState';
import { HumanAgentCallbacks } from '../../../src/chat/services/humanAgentCallbacks';
import { chatStore } from '../../../src/chat/services/attachChatView';
import { openPrompt } from '../../../src/chat/state';
import actions from '../../../src/sdk/store/actions';
import enLanguagePack from '../../../src/sdk/languages/en.json';
import {
  createBaseConfig,
  getChatHost,
  getChatShadowRoot,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

class MountStateProbe extends LitElement {
  mountState = new ContextConsumer(this, { context: chatMountStateContext });
}
customElements.define('test-prompt-reuse-probe', MountStateProbe);

function mountStateOf(host: Element): ChatMountState {
  const probe = document.createElement(
    'test-prompt-reuse-probe'
  ) as MountStateProbe;
  host.appendChild(probe);
  const { value } = probe.mountState;
  probe.remove();
  return value;
}

/** The titles of the open end-chat panel, as the mounted chat shows them. */
function openPromptTitles() {
  const titles = Array.from(
    getChatShadowRoot()?.querySelectorAll<HTMLElement>(
      '.cds-aichat--confirm-panel__title'
    ) ?? []
  );
  return titles
    .filter(
      (title) =>
        (title.closest('cds-aichat-panel') as { open?: boolean } | null)?.open
    )
    .map((title) => title.textContent);
}

/** Clicks a button in the open end-chat panel's footer. */
function clickPromptButton(label: string) {
  const button = Array.from(
    getChatShadowRoot()?.querySelectorAll<HTMLElement>(
      '[data-panel-name="endChat"] .cds-aichat--confirm-panel__button'
    ) ?? []
  ).find((candidate) => candidate.textContent === label);
  expect(button).toBeDefined();
  act(() => button.click());
}

/** Sets the saved agent connection, as a desk's connect and suspend do. */
function setAgent(
  store: ReturnType<typeof chatStore>,
  agent: { isConnected: boolean; isSuspended: boolean }
) {
  const persisted = store.getState().persistedToBrowserStorage;
  store.dispatch(
    actions.setAppStateValue('persistedToBrowserStorage', {
      ...persisted,
      humanAgentState: { ...persisted.humanAgentState, ...agent },
    })
  );
}

let namespaceCount = 0;

/** Renders a reuse-on chat and resolves once it rendered. */
async function mountChat(namespace: string) {
  const onAfterRender = jest.fn();
  const view = render(
    <ChatContainer
      {...createBaseConfig()}
      namespace={namespace}
      lifecycle={{ reuseInstance: true, releaseGraceMs: 2000 }}
      openChatByDefault
      onAfterRender={onAfterRender}
    />
  );
  await waitFor(() => expect(onAfterRender).toHaveBeenCalled(), {
    timeout: 8000,
  });
  return { view, mountState: mountStateOf(getChatHost()) };
}

beforeEach(setupBeforeEach);
afterEach(setupAfterEach);

describe('an open confirmation across a reuse remount (O20)', () => {
  it('stays open, and the next mount answers it with the original callbacks', async () => {
    namespaceCount += 1;
    const namespace = `prompt-reuse-${namespaceCount}`;
    const first = await mountChat(namespace);
    const chat = first.mountState.serviceManager;
    const endChat = jest
      .spyOn(chat.humanAgentService, 'endChat')
      .mockResolvedValue(undefined);
    const defaultTitle = enLanguagePack.agent_confirmCancelRequestTitle;

    // The header's end-chat prompt, then a card's prompt over it.
    act(() => new HumanAgentCallbacks(first.mountState).showConfirmEndChat());
    const onCardConfirm = jest.fn();
    act(() => {
      openPrompt(
        chatStore(chat),
        { kind: 'humanAgent', title: 'Leave the queue?' },
        { onConfirm: onCardConfirm }
      );
    });
    await waitFor(() =>
      expect(openPromptTitles()).toEqual(['Leave the queue?'])
    );

    first.view.unmount();
    const second = await mountChat(namespace);

    // The same chat, in a new mount, still asks.
    expect(second.mountState).not.toBe(first.mountState);
    expect(second.mountState.serviceManager).toBe(chat);
    await waitFor(() =>
      expect(openPromptTitles()).toEqual(['Leave the queue?'])
    );

    clickPromptButton(enLanguagePack.agent_confirmCancelRequestYes);
    expect(onCardConfirm).toHaveBeenCalledTimes(1);
    expect(endChat).not.toHaveBeenCalled();

    await waitFor(() => expect(openPromptTitles()).toEqual([defaultTitle]));
    clickPromptButton(enLanguagePack.agent_confirmCancelRequestYes);
    expect(endChat).toHaveBeenCalledTimes(1);
    expect(endChat).toHaveBeenCalledWith(true);
    await waitFor(() => expect(openPromptTitles()).toEqual([]));
    expect(onCardConfirm).toHaveBeenCalledTimes(1);

    second.view.unmount();
  }, 30000);

  it("closes a card's prompt left open by the last mount once the agent chat resumes", async () => {
    namespaceCount += 1;
    const namespace = `prompt-reuse-${namespaceCount}`;
    const first = await mountChat(namespace);
    const chat = first.mountState.serviceManager;
    const store = chatStore(chat);
    act(() => setAgent(store, { isConnected: true, isSuspended: true }));
    const card = { onConfirm: jest.fn(), onCancel: jest.fn() };
    act(() => new HumanAgentCallbacks(first.mountState).showConfirmEndChat());
    act(() => {
      openPrompt(store, { kind: 'humanAgent', title: 'Switch agents?' }, card);
    });

    first.view.unmount();
    const second = await mountChat(namespace);
    expect(store.getState().view.prompt).toMatchObject({ kind: 'humanAgent' });

    act(() => setAgent(store, { isConnected: true, isSuspended: false }));

    // The end-chat prompt under it shows again; the card's answers never ran.
    await waitFor(() =>
      expect(store.getState().view.prompt).toMatchObject({ kind: 'endChat' })
    );
    expect(card.onConfirm).not.toHaveBeenCalled();
    expect(card.onCancel).not.toHaveBeenCalled();
    second.view.unmount();
  }, 30000);

  it('with reuse off, a remount starts a new chat with nothing open', async () => {
    const onAfterRender = jest.fn();
    const config = { ...createBaseConfig(), openChatByDefault: true };
    const first = render(
      <ChatContainer {...config} onAfterRender={onAfterRender} />
    );
    await waitFor(() => expect(onAfterRender).toHaveBeenCalledTimes(1), {
      timeout: 8000,
    });
    const firstState = mountStateOf(getChatHost());
    act(() => new HumanAgentCallbacks(firstState).showConfirmEndChat());
    await waitFor(() => expect(openPromptTitles()).toHaveLength(1));

    first.unmount();
    const second = render(
      <ChatContainer {...config} onAfterRender={onAfterRender} />
    );
    await waitFor(() => expect(onAfterRender).toHaveBeenCalledTimes(2), {
      timeout: 8000,
    });

    const secondState = mountStateOf(getChatHost());
    expect(secondState.serviceManager).not.toBe(firstState.serviceManager);
    expect(
      chatStore(secondState.serviceManager).getState().view.prompt
    ).toBeNull();
    expect(openPromptTitles()).toEqual([]);
    second.unmount();
  }, 30000);
});
