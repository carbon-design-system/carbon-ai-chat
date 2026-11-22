// @vitest-environment jsdom
// happy-dom 21 does not retarget event.target out of shadow roots, which the chat's React handlers need.
/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import type {
  PublicConfig,
  ServiceDesk,
  ServiceDeskCallback,
} from '../../../aiChatEntry';
import {
  DANA,
  addConnect,
  allByRole,
  byRole,
  click,
  contractChat,
  contractSetup,
  isShownWithin,
  type ContractMount,
} from '../helpers/contract';

const END_BUTTON = 'Review this disconnect';
const END_TITLE = 'End the current agent chat?';
const CONFIRM_END = 'Confirm this disconnect';
const CONNECT = 'Request a replacement agent';
const CARD_TITLE = 'Leave the prior agent?';
const CONFIRM_REPLACEMENT = 'Confirm replacement agent';

function integration() {
  let callback: ServiceDeskCallback;
  const starts: string[] = [];
  let ends = 0;
  const factory: NonNullable<PublicConfig['serviceDeskFactory']> = async (
    parameters
  ) => {
    callback = parameters.callback;
    const desk: ServiceDesk = {
      getName: () => 'Confirmation contract desk',
      areAnyAgentsOnline: async () => true,
      startChat: async (message) => {
        starts.push(message.id);
      },
      endChat: async () => {
        ends += 1;
      },
      sendMessageToAgent: async () => undefined,
    };
    return desk;
  };
  return {
    factory,
    starts,
    get callback() {
      return callback;
    },
    get ends() {
      return ends;
    },
  };
}

function config(
  desk: ReturnType<typeof integration>,
  cardTitle = CARD_TITLE
): PublicConfig {
  return {
    openChatByDefault: true,
    messaging: { skipWelcome: true },
    serviceDeskFactory: desk.factory,
    strings: {
      agent_connectedButtonEndChat: END_BUTTON,
      agent_endChat: END_TITLE,
      agent_confirmEndChatYes: CONFIRM_END,
      agent_confirmEndChatNo: 'Keep the current agent',
      agent_startChat: CONNECT,
      agent_confirmSuspendedEndChatTitle: cardTitle,
      agent_confirmEndSuspendedYes: CONFIRM_REPLACEMENT,
    },
  };
}

async function join(
  mount: ContractMount,
  desk: ReturnType<typeof integration>
): Promise<void> {
  await act(() => mount.instance.serviceDesk.startConversation());
  await act(() => desk.callback.agentJoined(DANA));
  expect(mount.instance.state.get().humanAgent.isConnected).toBe(true);
}

async function disposeReused(
  first: ContractMount,
  current: ContractMount | undefined,
  destroyConfig: PublicConfig
): Promise<void> {
  // A failed assertion before adoption still disposes the owned released chat publicly.
  const mounted =
    current ??
    (first.host.isConnected ? first : await contractChat(destroyConfig));
  await mounted.rerender(destroyConfig);
  try {
    await act(() => mounted.instance.serviceDesk.endConversation());
  } finally {
    await act(async () => mounted.unmount());
  }
}

describe('public human-agent confirmation ownership', () => {
  contractSetup();

  it('cancels a disconnect and keeps the reopened question actionable across a reused host', async () => {
    const desk = integration();
    const reuse: PublicConfig = {
      ...config(desk),
      namespace: 'remaining-store-question',
      lifecycle: { reuseInstance: true },
    };
    const destroy: PublicConfig = {
      ...reuse,
      lifecycle: { reuseInstance: true, onUnmount: 'destroy' },
    };
    const first = await contractChat(reuse);
    let current: ContractMount | undefined;
    try {
      await join(first, desk);
      await click(byRole('button', END_BUTTON));
      const question = await waitFor(() => byRole('dialog', END_TITLE));
      const cancelTarget = await waitFor(() => byRole('button', CONFIRM_END));
      expect(isShownWithin(cancelTarget, question)).toBe(true);
      await act(async () => {
        cancelTarget.focus();
        cancelTarget.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Escape',
            bubbles: true,
            composed: true,
            cancelable: true,
          })
        );
      });
      await waitFor(() =>
        expect(allByRole('dialog', END_TITLE)).toHaveLength(0)
      );
      expect(desk.ends).toBe(0);
      expect(first.instance.state.get().humanAgent.isConnected).toBe(true);
      await click(byRole('button', END_BUTTON));
      await waitFor(() => expect(byRole('dialog', END_TITLE)).not.toBeNull());
      await act(async () => first.unmount());
      current = await contractChat(destroy);
      const retained = await waitFor(() => byRole('dialog', END_TITLE));
      expect(current.instance.state.get().humanAgent.isConnected).toBe(true);
      expect(desk.starts).toHaveLength(1);
      const confirm = await waitFor(() => byRole('button', CONFIRM_END));
      expect(isShownWithin(confirm, retained)).toBe(true);
      await click(confirm);
      await waitFor(() => expect(desk.ends).toBe(1));
      await waitFor(() =>
        expect(allByRole('dialog', END_TITLE)).toHaveLength(0)
      );
      await waitFor(() =>
        expect(current.instance.state.get().humanAgent.isConnected).toBe(false)
      );
    } finally {
      await disposeReused(first, current, destroy);
    }
  });

  it('keeps the replacement suspended question after a public title update and confirms its actual desk action', async () => {
    const desk = integration();
    const mount = await contractChat(config(desk));
    const nextTitle = 'Confirm the newly worded replacement';
    try {
      await join(mount, desk);
      await act(() => mount.instance.serviceDesk.updateIsSuspended(true));
      await addConnect(mount.instance, 'replacement-request');
      await waitFor(() => expect(byRole('button', CONNECT)).toBeEnabled());
      await click(byRole('button', CONNECT));
      await waitFor(() => expect(byRole('dialog', CARD_TITLE)).not.toBeNull());
      await mount.rerender(config(desk, nextTitle));
      const current = await waitFor(() => byRole('dialog', nextTitle));
      expect(allByRole('dialog', CARD_TITLE)).toHaveLength(0);
      expect(desk.ends).toBe(0);
      expect(desk.starts).toHaveLength(1);
      const confirm = await waitFor(() =>
        byRole('button', CONFIRM_REPLACEMENT)
      );
      expect(isShownWithin(confirm, current)).toBe(true);
      await click(confirm);
      await waitFor(() => expect(desk.starts).toHaveLength(2));
      expect(desk.starts[1]).toBe('replacement-request');
      expect(desk.ends).toBe(1);
      await waitFor(() =>
        expect(allByRole('dialog', nextTitle)).toHaveLength(0)
      );
    } finally {
      try {
        await act(() => mount.instance.serviceDesk.endConversation());
      } finally {
        await act(async () => mount.unmount());
      }
    }
  });
});
