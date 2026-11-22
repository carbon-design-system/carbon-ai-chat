/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';

import {
  BusEventType,
  MessageResponseTypes,
  PanelType,
  type BusEventWorkspaceOpen,
  type ChatInstance,
  type PreviewCardItem,
} from '../../../aiChatEntry';
import {
  allByRole,
  byRole,
  click,
  contractChat,
  contractSetup,
  recordEvents,
  responseOf,
  textItem,
} from '../helpers/contract';

const STRINGS = {
  previewCard_viewDetails: 'Open host workspace',
  previewCard_viewing: 'Viewing host workspace',
};
const WORKSPACE_EVENTS = [
  BusEventType.WORKSPACE_PRE_OPEN,
  BusEventType.WORKSPACE_OPEN,
  BusEventType.WORKSPACE_PRE_CLOSE,
  BusEventType.WORKSPACE_CLOSE,
];
type SourceEvent = { type: BusEventType; data: BusEventWorkspaceOpen['data'] };

function previewCard(workspaceID: string): PreviewCardItem {
  return {
    response_type: MessageResponseTypes.PREVIEW_CARD,
    title: workspaceID || 'Untitled host card',
    workspace_id: workspaceID,
  };
}

async function mountForCards() {
  return contractChat({
    openChatByDefault: true,
    messaging: { skipWelcome: true },
    strings: STRINGS,
  });
}

function publicCardID(instance: ChatInstance, messageID: string) {
  return instance.state
    .get()
    .messageItems.find(
      (entry) =>
        entry.messageID === messageID &&
        entry.item.response_type === MessageResponseTypes.PREVIEW_CARD
    )?.id;
}

function sourceTuple(event: SourceEvent) {
  return [
    event.type,
    event.data.workspaceId,
    event.data.messageID,
    event.data.itemID,
  ];
}

function expectCodeCycle(events: SourceEvent[], workspaceID: string) {
  expect(events.map(({ type, data }) => [type, data.workspaceId])).toEqual(
    WORKSPACE_EVENTS.map((type) => [type, workspaceID])
  );
  for (const { data } of events) {
    expect(data).not.toHaveProperty('messageID');
    expect(data).not.toHaveProperty('itemID');
  }
}

// @covers response-type.preview_card instance.messaging.addMessage
// @covers instance.customPanels.getPanel().open instance.customPanels.getPanel().close
// @covers event.workspace:pre:open event.workspace:open
// @covers event.workspace:pre:close event.workspace:close state.messageItems
// @covers state.workspace.workspaceID config.strings

describe('public workspace source ownership', () => {
  contractSetup();

  it('keeps each card source through close before assigning the next card source', async () => {
    const { instance } = await mountForCards();
    await act(async () => {
      await instance.messaging.addMessage(
        responseOf('first-card-response', [
          textItem('A plan before its card'),
          previewCard('first-workspace'),
        ])
      );
      await instance.messaging.addMessage(
        responseOf('second-card-response', [previewCard('second-workspace')])
      );
    });
    const firstID = publicCardID(instance, 'first-card-response');
    const secondID = publicCardID(instance, 'second-card-response');
    expect(firstID).toEqual(expect.any(String));
    expect(secondID).toEqual(expect.any(String));
    expect(firstID).not.toBe(secondID);
    const events = recordEvents(instance, WORKSPACE_EVENTS);
    const buttons = allByRole('button', STRINGS.previewCard_viewDetails);
    expect(buttons).toHaveLength(2);
    await click(buttons[0]);
    await waitFor(() =>
      expect(events.types()).toEqual(WORKSPACE_EVENTS.slice(0, 2))
    );
    await click(buttons[1]);
    await waitFor(() => expect(events.types()).toHaveLength(6));
    await act(() =>
      instance.customPanels.getPanel(PanelType.WORKSPACE).close()
    );
    expect((events.events as SourceEvent[]).map(sourceTuple)).toEqual([
      ...WORKSPACE_EVENTS.map((type) => [
        type,
        'first-workspace',
        'first-card-response',
        firstID,
      ]),
      ...WORKSPACE_EVENTS.map((type) => [
        type,
        'second-workspace',
        'second-card-response',
        secondID,
      ]),
    ]);
    expect(instance.state.get().workspace.isOpen).toBe(false);
  });

  it('omits source IDs for code opens both before cards and after a card closes', async () => {
    const { instance } = await mountForCards();
    const panel = instance.customPanels.getPanel(PanelType.WORKSPACE);
    const events = recordEvents(instance, WORKSPACE_EVENTS);
    await act(async () => {
      await panel.open({ workspaceId: 'initial-code' });
      await panel.close();
    });
    expectCodeCycle(events.events as SourceEvent[], 'initial-code');

    await act(() =>
      instance.messaging.addMessage(
        responseOf('card-before-code', [previewCard('card-workspace')])
      )
    );
    const itemID = publicCardID(instance, 'card-before-code');
    expect(itemID).toEqual(expect.any(String));
    events.clear();
    await click(byRole('button', STRINGS.previewCard_viewDetails));
    await waitFor(() =>
      expect(events.types()).toEqual(WORKSPACE_EVENTS.slice(0, 2))
    );
    expect(sourceTuple(events.events[1] as SourceEvent)).toEqual([
      BusEventType.WORKSPACE_OPEN,
      'card-workspace',
      'card-before-code',
      itemID,
    ]);
    await act(() => panel.close());
    events.clear();
    await act(async () => {
      await panel.open({ workspaceId: 'code-after-card' });
      await panel.close();
    });
    expectCodeCycle(events.events as SourceEvent[], 'code-after-card');
  });

  it('drops a blank card source when code replaces its open workspace', async () => {
    const { instance } = await mountForCards();
    await act(() =>
      instance.messaging.addMessage(
        responseOf('blank-card-response', [previewCard('')])
      )
    );
    const itemID = publicCardID(instance, 'blank-card-response');
    expect(itemID).toEqual(expect.any(String));
    const events = recordEvents(instance, WORKSPACE_EVENTS);
    await click(byRole('button', STRINGS.previewCard_viewDetails));
    await waitFor(() =>
      expect(events.types()).toEqual(WORKSPACE_EVENTS.slice(0, 2))
    );
    expect((events.events as SourceEvent[]).map(sourceTuple)).toEqual(
      WORKSPACE_EVENTS.slice(0, 2).map((type) => [
        type,
        '',
        'blank-card-response',
        itemID,
      ])
    );
    events.clear();
    const panel = instance.customPanels.getPanel(PanelType.WORKSPACE);
    await act(async () => {
      await panel.open({ workspaceId: 'code-replaces-blank' });
      await panel.close();
    });
    expect(
      (events.events.slice(0, 2) as SourceEvent[]).map(sourceTuple)
    ).toEqual(
      WORKSPACE_EVENTS.slice(2).map((type) => [
        type,
        '',
        'blank-card-response',
        itemID,
      ])
    );
    expectCodeCycle(
      events.events.slice(2) as SourceEvent[],
      'code-replaces-blank'
    );
  });

  // @covers instance.messaging.restartConversation event.restartConversation
  it('drops the card source after an awaited restart inside workspace pre:open', async () => {
    const { instance } = await mountForCards();
    await act(() =>
      instance.messaging.addMessage(
        responseOf('restart-card-response', [previewCard('restart-workspace')])
      )
    );
    const itemID = publicCardID(instance, 'restart-card-response');
    expect(itemID).toEqual(expect.any(String));
    const events = recordEvents(instance, WORKSPACE_EVENTS);
    instance.once({
      type: BusEventType.WORKSPACE_PRE_OPEN,
      handler: () => instance.messaging.restartConversation(),
    });
    await click(byRole('button', STRINGS.previewCard_viewDetails));
    await waitFor(() =>
      expect(events.types()).toEqual(WORKSPACE_EVENTS.slice(0, 2))
    );
    expect(sourceTuple(events.events[0] as SourceEvent)).toEqual([
      BusEventType.WORKSPACE_PRE_OPEN,
      'restart-workspace',
      'restart-card-response',
      itemID,
    ]);
    await act(() =>
      instance.customPanels.getPanel(PanelType.WORKSPACE).close()
    );
    expect(events.types()).toEqual(WORKSPACE_EVENTS);
    for (const { data } of events.events.slice(1) as SourceEvent[]) {
      expect(data).not.toHaveProperty('messageID');
      expect(data).not.toHaveProperty('itemID');
    }
    expect(instance.state.get().workspace.isOpen).toBe(false);
  });
});
