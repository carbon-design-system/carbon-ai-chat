/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act } from '@testing-library/react';
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

const card: PreviewCardItem = {
  response_type: MessageResponseTypes.PREVIEW_CARD,
  title: 'Plan',
  workspace_id: 'plan-workspace',
  additional_data: { step: 1 },
};

/** A chat with a text item and then a preview card, recording each workspace event's data. */
async function chatWithCard() {
  const chat = await renderChatAndGetInstanceWithStore(createBaseConfig());
  const events: Record<string, any> = {};
  WORKSPACE_EVENTS.forEach((type) =>
    chat.instance.on({
      type,
      handler: (event: any) => {
        events[type] = { ...event.data };
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
  });
  return { ...chat, events };
}

/** Opens the workspace as the preview card's button does. */
async function openFromCard({
  store,
  instance,
}: Awaited<ReturnType<typeof chatWithCard>>) {
  const state = store.getState();
  const localItem = Object.values(state.allMessageItemsByID).find(
    (item) => item.item.response_type === MessageResponseTypes.PREVIEW_CARD
  );
  store.dispatch(
    viewActions.setWorkspacePanelData({
      workspaceID: card.workspace_id,
      localMessageItem: localItem,
      fullMessage: state.allMessagesByID.plan,
      additionalData: card.additional_data,
    })
  );
  await act(async () => {
    await instance.customPanels.getPanel(PanelType.WORKSPACE).open({
      workspaceId: card.workspace_id,
      additionalData: card.additional_data,
    });
  });
}

describe('workspace event message and item IDs', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('gives each workspace event from a preview card the IDs of its message and item', async () => {
    const chat = await chatWithCard();
    await openFromCard(chat);
    await act(async () => {
      await chat.instance.customPanels.getPanel(PanelType.WORKSPACE).close();
    });

    const cardEntry = chat.instance
      .getState()
      .messageItems.find(
        (entry) =>
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
    const chat = await chatWithCard();
    const panel = chat.instance.customPanels.getPanel(PanelType.WORKSPACE);
    await act(async () => {
      await panel.open({ workspaceId: 'from-code' });
      await panel.close();
    });

    WORKSPACE_EVENTS.forEach((type) => {
      expect(chat.events[type]).toMatchObject({ workspaceId: 'from-code' });
      expect(chat.events[type]).not.toHaveProperty('messageID');
      expect(chat.events[type]).not.toHaveProperty('itemID');
    });
  });

  it('drops the IDs once the workspace from a card closes', async () => {
    const chat = await chatWithCard();
    await openFromCard(chat);
    const panel = chat.instance.customPanels.getPanel(PanelType.WORKSPACE);
    await act(async () => {
      await panel.close();
      await panel.open({ workspaceId: 'from-code' });
    });

    expect(chat.events[BusEventType.WORKSPACE_OPEN]).toMatchObject({
      workspaceId: 'from-code',
    });
    expect(chat.events[BusEventType.WORKSPACE_OPEN]).not.toHaveProperty(
      'messageID'
    );
  });
});
