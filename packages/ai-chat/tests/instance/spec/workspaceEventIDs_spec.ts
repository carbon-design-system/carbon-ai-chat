/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act } from '@testing-library/react';
import { setWorkspaceCardSource } from '../../../src/chat/services/CustomPanelInstance';
import { viewActions } from '../../../src/chat/state';
import { BusEventType } from '../../../src/types/events/eventBusTypes';
import { PanelType } from '../../../src/types/instance/apiTypes';
import {
  MessageResponseTypes,
  type PreviewCardItem,
} from '../../../src/types/messaging/Messages';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

const WORKSPACE_EVENTS = [
  BusEventType.WORKSPACE_PRE_OPEN,
  BusEventType.WORKSPACE_OPEN,
  BusEventType.WORKSPACE_PRE_CLOSE,
  BusEventType.WORKSPACE_CLOSE,
] as const;

function previewCard(
  workspaceID: string,
  additionalData?: unknown
): PreviewCardItem {
  return {
    response_type: MessageResponseTypes.PREVIEW_CARD,
    title: workspaceID || 'Untitled',
    workspace_id: workspaceID,
    ...(additionalData !== undefined && { additional_data: additionalData }),
  };
}

const card = previewCard('plan-workspace', { step: 1 });

/**
 * A chat with three cards, recording each workspace event's data: `plan` (a text item, then
 * `card`), `other` (a second card), and `blank` (a card with no workspace ID or data).
 */
async function chatWithCards() {
  const chat = await renderChatAndGetInstanceWithStore(createBaseConfig());
  const events: Record<string, any> = {};
  const log: any[] = [];
  WORKSPACE_EVENTS.forEach((type) =>
    chat.instance.on({
      type,
      handler: (event: any) => {
        events[type] = { ...event.data };
        log.push({ type, ...event.data });
      },
    })
  );
  await act(async () => {
    await chat.instance.messaging.addMessage({
      id: 'plan',
      output: {
        generic: [
          { response_type: MessageResponseTypes.TEXT, text: 'Here is a plan.' },
          card,
        ],
      },
    });
    await chat.instance.messaging.addMessage({
      id: 'other',
      output: { generic: [previewCard('other-workspace')] },
    });
    await chat.instance.messaging.addMessage({
      id: 'blank',
      output: { generic: [previewCard('')] },
    });
  });
  return { ...chat, events, log };
}

/** Opens the workspace from a message's card, as the card's button does. */
async function openFromCard(
  {
    store,
    serviceManager,
    instance,
  }: Awaited<ReturnType<typeof chatWithCards>>,
  messageID: string
) {
  const state = store.getState();
  const fullMessage = state.allMessagesByID[messageID];
  const localItem = Object.values(state.allMessageItemsByID).find(
    (item) =>
      item.fullMessageID === messageID &&
      item.item.response_type === MessageResponseTypes.PREVIEW_CARD
  );
  const { workspace_id, additional_data } = localItem.item as PreviewCardItem;
  store.dispatch(
    viewActions.setWorkspacePanelData({
      workspaceID: workspace_id,
      localMessageItem: localItem,
      fullMessage,
      additionalData: additional_data,
    })
  );
  setWorkspaceCardSource(serviceManager, fullMessage, localItem);
  await act(async () => {
    await instance.customPanels.getPanel(PanelType.WORKSPACE).open({
      workspaceId: workspace_id,
      additionalData: additional_data,
    });
  });
}

function expectNoIDs(data: object) {
  expect(data).not.toHaveProperty('messageID');
  expect(data).not.toHaveProperty('itemID');
}

describe('workspace event message and item IDs', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('gives each workspace event from a preview card the IDs of its message and item', async () => {
    const chat = await chatWithCards();
    await openFromCard(chat, 'plan');
    await act(async () => {
      await chat.instance.customPanels.getPanel(PanelType.WORKSPACE).close();
    });

    const cardEntry = chat.instance
      .getState()
      .messageItems.find(
        (entry) =>
          entry.messageID === 'plan' &&
          entry.item.response_type === MessageResponseTypes.PREVIEW_CARD
      );
    expect(cardEntry.id).toBe('plan:i:1');
    WORKSPACE_EVENTS.forEach((type) => {
      expect({ type, ...chat.events[type] }).toMatchObject({
        type,
        workspaceId: card.workspace_id,
        messageID: 'plan',
        itemID: cardEntry.id,
      });
    });
  });

  it('gives no IDs to a workspace that code opened', async () => {
    const chat = await chatWithCards();
    const panel = chat.instance.customPanels.getPanel(PanelType.WORKSPACE);
    await act(async () => {
      await panel.open({ workspaceId: 'from-code' });
      await panel.close();
    });

    WORKSPACE_EVENTS.forEach((type) => {
      expect(chat.events[type]).toMatchObject({ workspaceId: 'from-code' });
      expectNoIDs(chat.events[type]);
    });
  });

  it('drops the IDs once the workspace from a card closes', async () => {
    const chat = await chatWithCards();
    await openFromCard(chat, 'plan');
    const panel = chat.instance.customPanels.getPanel(PanelType.WORKSPACE);
    await act(async () => {
      await panel.close();
      await panel.open({ workspaceId: 'from-code' });
    });

    expect(chat.events[BusEventType.WORKSPACE_OPEN]).toMatchObject({
      workspaceId: 'from-code',
    });
    expectNoIDs(chat.events[BusEventType.WORKSPACE_OPEN]);
  });

  it("doesn't give a card's IDs to a code open while that card's message stays in the workspace state", async () => {
    const chat = await chatWithCards();
    // With no workspace ID or data, the card's open leaves its message in the workspace state.
    await openFromCard(chat, 'blank');
    expect(chat.store.getState().view.workspacePanelState.fullMessage?.id).toBe(
      'blank'
    );
    const panel = chat.instance.customPanels.getPanel(PanelType.WORKSPACE);
    chat.log.length = 0;
    await act(async () => {
      await panel.open({ workspaceId: 'from-code' });
    });
    const opens = chat.log.filter(
      (event) =>
        event.type === BusEventType.WORKSPACE_PRE_OPEN ||
        event.type === BusEventType.WORKSPACE_OPEN
    );
    expect(opens).toHaveLength(2);
    opens.forEach(expectNoIDs);

    chat.log.length = 0;
    await act(async () => {
      await panel.close();
    });
    expect(chat.log).toHaveLength(2);
    chat.log.forEach(expectNoIDs);
  });

  it('drops the IDs after the conversation restarts', async () => {
    const chat = await chatWithCards();
    await openFromCard(chat, 'plan');
    await act(async () => {
      await chat.instance.messaging.restartConversation();
    });
    chat.log.length = 0;
    await act(async () => {
      await chat.instance.customPanels.getPanel(PanelType.WORKSPACE).close();
    });

    expect(chat.log.map(({ type }) => type)).toEqual([
      BusEventType.WORKSPACE_PRE_CLOSE,
      BusEventType.WORKSPACE_CLOSE,
    ]);
    chat.log.forEach(expectNoIDs);
  });

  it("gives a second card's open its own IDs while the first card's workspace closes", async () => {
    const chat = await chatWithCards();
    await openFromCard(chat, 'plan');
    chat.log.length = 0;
    await openFromCard(chat, 'other');

    // The first workspace's close finishes after the second's pre-open, so its IDs must
    // not clear the second card's.
    const ids = (type: string) =>
      chat.log
        .filter((event) => event.type === type)
        .map(({ messageID, itemID }) => ({ messageID, itemID }));
    const other = { messageID: 'other', itemID: 'other:i:0' };
    const plan = { messageID: 'plan', itemID: 'plan:i:1' };
    expect(ids(BusEventType.WORKSPACE_PRE_CLOSE)).toEqual([plan]);
    expect(ids(BusEventType.WORKSPACE_CLOSE)).toEqual([plan]);
    expect(ids(BusEventType.WORKSPACE_PRE_OPEN)).toEqual([other]);
    expect(ids(BusEventType.WORKSPACE_OPEN)).toEqual([other]);
  });
});
