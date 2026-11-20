/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  coordinateUserDefinedResponseItems,
  handleCustomFooterSlot,
} from '../../../src/sdk/services/messaging/coordinateMessageEvents';
import type { ServiceManager } from '../../../src/sdk/services/ServiceManager';
import { createCustomPanelInstance } from '../../../src/chat/services/CustomPanelInstance';
import { viewActions } from '../../../src/chat/state';
import { PanelType } from '../../../src/types/instance/apiTypes';
import actions from '../../../src/sdk/store/actions';
import { BusEventType } from '../../../src/types/events/eventBusTypes';
import {
  MessageResponseTypes,
  type MessageResponse,
} from '../../../src/types/messaging/Messages';
import { makeConfigStore, withPublicState } from '../../test_helpers';

/** A response with one user-defined item that has a custom footer slot. */
function customResponse(id: string, agent = false): MessageResponse {
  return {
    id,
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.USER_DEFINED,
          user_defined: { edits: 0 },
          ...(agent && { agent_message_type: 'agent' as any }),
          message_item_options: {
            custom_footer_slot: { is_on: true, slot_name: `${id}-footer` },
          },
        },
      ],
    },
  };
}

/**
 * A chat's store and a service manager that runs `handler` for every event. Messages in
 * the store aren't frozen, as for a stored message that still takes slot edits.
 */
function chat(handler: (event: any) => void) {
  const store = makeConfigStore({});
  const manager = {
    restartCount: 0,
    store,
    fire: jest.fn(async (event: unknown) => handler(event)),
    messageCoordinator: {
      trackIncomingWrite: () => ({ isCurrent: () => true, release() {} }),
    },
  } as unknown as ServiceManager;

  /** Stores a message, then fires its user-defined and footer events. */
  async function fireSlots(message: MessageResponse) {
    store.dispatch(actions.upsertMessage(message));
    // Each event reads the store again, since the last one's edits replaced the stored copies.
    const current = () => {
      const state = store.getState();
      return {
        stored: state.allMessagesByID[message.id] as MessageResponse,
        local: Object.values(state.allMessageItemsByID).find(
          (item) => item.fullMessageID === message.id
        ),
      };
    };
    let { stored, local } = current();
    await coordinateUserDefinedResponseItems(manager, undefined, local, stored);
    ({ stored, local } = current());
    await handleCustomFooterSlot(manager, local, stored);
  }

  return { store, manager, fireSlots };
}

/** The stored local copy of a message's item, where slot edits to the item are kept. */
function storedItem(
  store: ReturnType<typeof chat>['store'],
  messageID: string
) {
  return Object.values(store.getState().allMessageItemsByID).find(
    (item) => item.fullMessageID === messageID
  ).item as any;
}

function editingHandler(event: any) {
  if (event.type === BusEventType.USER_DEFINED_RESPONSE) {
    event.data.message.user_defined.edits += 1;
  } else {
    event.data.messageItem.user_defined.footerSeen = true;
  }
}

/** The edit warnings logged so far. */
function editWarnings(warn: jest.SpyInstance) {
  return warn.mock.calls
    .map(([text]) => String(text))
    .filter((text) => text.includes('handler edited its event data'));
}

describe('payload edit warnings', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warn.mockRestore();
  });

  it('warns once per event type per chat, and keeps each edit', async () => {
    const { store, fireSlots } = chat(editingHandler);
    await fireSlots(customResponse('first'));
    await fireSlots(customResponse('second'));

    const warnings = editWarnings(warn);
    expect(warnings).toEqual([
      expect.stringContaining(`"${BusEventType.USER_DEFINED_RESPONSE}"`),
      expect.stringContaining(`"${BusEventType.CUSTOM_FOOTER_SLOT}"`),
    ]);
    warnings.forEach((text) =>
      expect(text).toContain('messaging.upsertMessage')
    );
    ['first', 'second'].forEach((id) =>
      expect(storedItem(store, id).user_defined).toEqual({
        edits: 1,
        footerSeen: true,
      })
    );
  });

  it('warns again in a second chat', async () => {
    await chat(editingHandler).fireSlots(customResponse('first'));
    await chat(editingHandler).fireSlots(customResponse('second'));

    expect(editWarnings(warn)).toHaveLength(4);
  });

  it("doesn't warn for handlers that only read their payloads", async () => {
    const seen: string[] = [];
    await chat((event) => seen.push(JSON.stringify(event.data))).fireSlots(
      customResponse('read')
    );

    expect(seen).toHaveLength(2);
    expect(editWarnings(warn)).toEqual([]);
  });

  it("doesn't watch an agent's item, whose edits the human-agent path keeps", async () => {
    const { store, fireSlots } = chat(editingHandler);
    await fireSlots(customResponse('agent', true));

    expect(storedItem(store, 'agent').user_defined).toEqual({
      edits: 1,
      footerSeen: true,
    });
    expect(editWarnings(warn)).toEqual([]);
  });

  it('shares one warning per workspace event between message and additional data edits, and keeps both', async () => {
    const store = makeConfigStore({});
    const manager = withPublicState({
      restartCount: 0,
      store,
      eventBus: {
        fire: async (event: any) => {
          if (event.type !== BusEventType.WORKSPACE_PRE_OPEN) {
            return;
          }
          if (event.data.message) {
            event.data.message.title = 'Edited plan';
          } else {
            event.data.additionalData.step = 2;
          }
        },
      },
      instance: {},
    }) as unknown as ServiceManager;
    const panel = createCustomPanelInstance(PanelType.WORKSPACE, manager);
    store.dispatch(
      actions.upsertMessage({
        id: 'plan',
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.PREVIEW_CARD,
              title: 'Plan',
              workspace_id: '',
            },
          ],
        },
      })
    );
    const state = store.getState();
    // An empty workspace ID keeps the card's message in the payload.
    store.dispatch(
      viewActions.setWorkspacePanelData({
        workspaceID: '',
        localMessageItem: Object.values(state.allMessageItemsByID)[0],
        fullMessage: state.allMessagesByID.plan,
      })
    );
    await panel.open({ workspaceId: '' });
    await panel.close();
    await panel.open({ workspaceId: 'data', additionalData: { step: 1 } });

    expect(editWarnings(warn)).toEqual([
      expect.stringContaining(`"${BusEventType.WORKSPACE_PRE_OPEN}"`),
    ]);
    expect(
      (store.getState().allMessagesByID.plan as MessageResponse).output
        .generic[0]
    ).toMatchObject({ title: 'Edited plan' });
    expect(store.getState().view.workspacePanelState.additionalData).toEqual({
      step: 2,
    });
  });
});
