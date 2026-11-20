/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, cleanup } from '@testing-library/react';
import { createChatSDK } from '../../../../src/sdk';
import type {
  ServiceDesk,
  ServiceDeskCallback,
} from '../../../../src/types/config/ServiceDeskConfig';
import { BusEventType } from '../../../../src/types/events/eventBusTypes';
import type { ChatInstance } from '../../../../src/types/instance/ChatInstance';
import { PanelType } from '../../../../src/types/instance/apiTypes';
import {
  MessageResponseTypes,
  UserType,
  type MessageResponse,
} from '../../../../src/types/messaging/Messages';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../../test_helpers';

/** The edit warnings the chat logged so far. */
function editWarnings(warn: jest.SpyInstance) {
  return warn.mock.calls
    .map(([text]) => String(text))
    .filter((text) => text.includes('handler edited its event data'));
}

async function addChunk(instance: ChatInstance) {
  await act(async () => {
    await instance.messaging.addMessageChunk({
      streaming_metadata: { response_id: 'streamed' },
      partial_item: {
        response_type: MessageResponseTypes.USER_DEFINED,
        streaming_metadata: { id: 'custom' },
        user_defined: { text: 'Part' },
      },
    });
  });
}

describe('warnings for edited workspace and stream payloads', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    setupBeforeEach();
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warn.mockRestore();
    setupAfterEach();
  });

  it('warns once for edited stream chunks', async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    instance.on({
      type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
      handler: (event: any) => {
        event.data.messageItem.user_defined.seen = true;
      },
    });
    await addChunk(instance);
    await addChunk(instance);

    expect(editWarnings(warn)).toEqual([
      expect.stringContaining(`"${BusEventType.CHUNK_USER_DEFINED_RESPONSE}"`),
    ]);
  });

  it('warns for an additional data edit alone, once per chat', async () => {
    const editData = async () => {
      const { instance } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      instance.on({
        type: BusEventType.WORKSPACE_OPEN,
        handler: (event: any) => {
          event.data.additionalData.step += 1;
        },
      });
      const panel = instance.customPanels.getPanel(PanelType.WORKSPACE);
      await act(async () => {
        await panel.open({ workspaceId: 'data', additionalData: { step: 1 } });
        await panel.close();
        await panel.open({ workspaceId: 'data', additionalData: { step: 1 } });
      });
      expect(instance.getState().workspace.additionalData).toEqual({ step: 2 });
    };

    await editData();
    expect(editWarnings(warn)).toEqual([
      expect.stringContaining(`"${BusEventType.WORKSPACE_OPEN}"`),
    ]);
    cleanup();
    await editData();
    expect(editWarnings(warn)).toHaveLength(2);
  });

  it("doesn't warn for handlers that only read their payloads", async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    const seen = new Set<string>();
    instance.on(
      [
        BusEventType.CHUNK_USER_DEFINED_RESPONSE,
        BusEventType.WORKSPACE_PRE_OPEN,
        BusEventType.WORKSPACE_OPEN,
        BusEventType.WORKSPACE_PRE_CLOSE,
        BusEventType.WORKSPACE_CLOSE,
      ].map((type) => ({
        type,
        handler: (event: any) => {
          JSON.stringify(event.data);
          seen.add(type);
        },
      }))
    );

    await addChunk(instance);
    const panel = instance.customPanels.getPanel(PanelType.WORKSPACE);
    await act(async () => {
      await panel.open({ workspaceId: 'read', additionalData: { step: 1 } });
      await panel.close();
    });

    expect(seen.size).toBe(5);
    expect(editWarnings(warn)).toEqual([]);
  });

  it("doesn't warn when a pre:receive handler edits the message", async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    instance.on({
      type: BusEventType.PRE_RECEIVE,
      handler: (event: any) => {
        event.data.output.generic[0].text = 'Edited before';
      },
    });
    await act(async () => {
      await instance.messaging.addMessage({
        id: 'received',
        output: {
          generic: [
            { response_type: MessageResponseTypes.TEXT, text: 'Before' },
          ],
        },
      });
    });

    expect(
      (store.getState().allMessagesByID.received as MessageResponse).output
        .generic[0]
    ).toMatchObject({ text: 'Edited before' });
    expect(editWarnings(warn)).toEqual([]);
  });

  it("doesn't warn when handlers edit an agent's message", async () => {
    let callback: ServiceDeskCallback;
    const chat = await createChatSDK({
      messaging: { skipWelcome: true },
      serviceDeskFactory: async (parameters) => {
        callback = parameters.callback;
        return {
          getName: () => 'Test desk',
          startChat: async () => {},
          endChat: async () => {},
          sendMessageToAgent: async () => {},
        } as unknown as ServiceDesk;
      },
    });
    try {
      const editAgentItem = (key: string) => (event: any) => {
        const [item] = event.data.output.generic;
        if (item.user_defined) {
          item.user_defined[key] = true;
        }
      };
      chat.on([
        {
          type: BusEventType.HUMAN_AGENT_PRE_RECEIVE,
          handler: editAgentItem('pre'),
        },
        {
          type: BusEventType.USER_DEFINED_RESPONSE,
          handler: (event: any) => {
            event.data.message.user_defined.slot = true;
          },
        },
        {
          type: BusEventType.HUMAN_AGENT_RECEIVE,
          handler: editAgentItem('received'),
        },
      ]);
      await chat.serviceDesk.startConversation();
      await callback.agentJoined({
        id: 'dana',
        nickname: 'Dana',
        user_type: UserType.HUMAN,
      });
      await callback.sendMessageToUser(
        {
          id: 'from-agent',
          output: {
            generic: [
              {
                response_type: MessageResponseTypes.USER_DEFINED,
                user_defined: {},
              },
            ],
          },
        },
        'dana'
      );

      const agentItem = chat.state
        .get()
        .messageItems.find((entry) => entry.messageID === 'from-agent');
      expect(agentItem.item).toMatchObject({
        user_defined: { pre: true, slot: true, received: true },
      });
      expect(editWarnings(warn)).toEqual([]);
    } finally {
      chat.destroy();
    }
  });
});
