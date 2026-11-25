/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import type { JSONContent } from '@tiptap/core';
import {
  BusEventType,
  PageObjectId,
  type BusEventHumanAgentPreSend,
  type BusEventHumanAgentSend,
  type ChatInstance,
  type MessageRequest,
  type StructuredData,
} from '../../../aiChatEntry';
import {
  contractChat,
  contractSetup,
  DANA,
  fakeDesk,
  getByTestId,
} from '../helpers/contract';

function textDoc(text: string): JSONContent {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  };
}

const mentionDoc: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Hey ' },
        { type: 'mention', attrs: { id: 'agent-1', label: 'Dana' } },
      ],
    },
  ],
};

async function sendDocument(instance: ChatInstance, content: JSONContent) {
  await act(() => instance.input.updateContent(() => content));
  const send = await waitFor(() => {
    const button = getByTestId(PageObjectId.INPUT_SEND);
    if (button.hasAttribute('disabled')) {
      throw new Error('The current input send control is still disabled');
    }
    return button;
  });
  await act(async () => send.click());
}

describe('public human-agent input ownership', () => {
  contractSetup();

  it('sends current rich agent data once while preserving the assistant picks through a real end', async () => {
    const desk = fakeDesk();
    const assistant: MessageRequest[] = [];
    const preSend: Array<{ content: JSONContent; data: StructuredData }> = [];
    const mount = await contractChat({
      openChatByDefault: true,
      input: {
        mention: { trigger: '@', items: [{ id: 'agent-1', label: 'Dana' }] },
      },
      serviceDeskFactory: desk.factory,
      messaging: {
        skipWelcome: true,
        customSendMessage: async (request) => {
          assistant.push(request);
        },
      },
    });
    const assistantPicks: StructuredData = {
      fields: [{ id: 'assistant-pick', value: 'saved assistant value' }],
    };
    const agentPicks: StructuredData = {
      fields: [{ id: 'agent-pick', value: 'current agent value' }],
    };
    const handler = {
      type: BusEventType.HUMAN_AGENT_PRE_SEND as const,
      handler: (event: BusEventHumanAgentPreSend): void => {
        preSend.push({
          content: event.data.input.display_content,
          data: event.data.input.structured_data,
        });
      },
    };
    mount.instance.on(handler);
    try {
      await act(async () => {
        mount.instance.input.updateStructuredData(() => assistantPicks);
        await mount.instance.serviceDesk.startConversation();
        await desk.callback().agentJoined(DANA);
        mount.instance.input.updateStructuredData(() => agentPicks);
      });
      await sendDocument(mount.instance, mentionDoc);
      await waitFor(() =>
        expect(desk.desk.sendMessageToAgent).toHaveBeenCalledTimes(1)
      );
      await waitFor(() =>
        expect(mount.instance.state.get().status).toBe('ready')
      );
      const first = desk.desk.sendMessageToAgent.mock.calls[0][0];
      expect(first.input.display_content).toMatchObject(mentionDoc);
      expect(first.input.structured_data).toEqual(agentPicks);
      expect(preSend[0]).toMatchObject({
        content: mentionDoc,
        data: agentPicks,
      });
      expect(assistant).toEqual([]);
      const plain = textDoc('Second agent send');
      await sendDocument(mount.instance, plain);
      await waitFor(() =>
        expect(desk.desk.sendMessageToAgent).toHaveBeenCalledTimes(2)
      );
      await waitFor(() =>
        expect(mount.instance.state.get().status).toBe('ready')
      );
      expect(
        desk.desk.sendMessageToAgent.mock.calls[1][0].input.display_content
      ).toMatchObject(plain);
      expect(
        desk.desk.sendMessageToAgent.mock.calls[1][0].input
      ).not.toHaveProperty('structured_data');
      await act(() => mount.instance.serviceDesk.endConversation());
      await act(() => mount.instance.send('Assistant after real agent end'));
      expect(assistant).toHaveLength(1);
      expect(assistant[0].input).toMatchObject({
        text: 'Assistant after real agent end',
        structured_data: assistantPicks,
      });
    } finally {
      mount.instance.off(handler);
      try {
        await act(() => mount.instance.serviceDesk.endConversation());
      } finally {
        await act(async () => mount.unmount());
      }
    }
  });

  it('commits real desk and send-event edits while retaining the unread earlier public snapshot', async () => {
    const desk = fakeDesk();
    const edited = textDoc('Display content from the host handler');
    let sent: MessageRequest;
    let before: ReturnType<ChatInstance['state']['get']>;
    const mount = await contractChat({
      openChatByDefault: true,
      serviceDeskFactory: desk.factory,
      messaging: { skipWelcome: true },
    });
    const preSend = {
      type: BusEventType.HUMAN_AGENT_PRE_SEND as const,
      handler: (event: BusEventHumanAgentPreSend): void => {
        sent = event.data;
        event.data.input.display_content = edited;
        event.data.input.structured_data = {
          user_defined: { value: 'before' },
        };
      },
    };
    const afterSend = {
      type: BusEventType.HUMAN_AGENT_SEND as const,
      handler: (event: BusEventHumanAgentSend): void => {
        event.data.input.structured_data.user_defined.value = 'after';
      },
    };
    desk.desk.sendMessageToAgent.mockImplementation(async (message) => {
      before = mount.instance.state.get();
      message.input.structured_data.user_defined.transport = 'accepted';
    });
    mount.instance.on([preSend, afterSend]);
    const current = () =>
      mount.instance.state
        .get()
        .messages.find(({ id }) => id === sent.id) as Readonly<MessageRequest>;
    try {
      await act(async () => {
        await mount.instance.serviceDesk.startConversation();
        await desk.callback().agentJoined(DANA);
      });
      await sendDocument(mount.instance, textDoc('Agent writeback request'));
      await waitFor(() =>
        expect(current()).toMatchObject({
          input: {
            structured_data: {
              user_defined: { value: 'after', transport: 'accepted' },
            },
          },
        })
      );
      expect(desk.desk.sendMessageToAgent).toHaveBeenCalledTimes(1);
      expect(
        desk.desk.sendMessageToAgent.mock.calls[0][0].input.display_content
      ).toEqual(edited);
      expect(before.messages.find(({ id }) => id === sent.id)).toMatchObject({
        input: { structured_data: { user_defined: { value: 'before' } } },
      });
      expect(
        (before.messages.find(({ id }) => id === sent.id) as MessageRequest)
          .input.structured_data.user_defined
      ).not.toHaveProperty('transport');
      sent.input.structured_data.user_defined.value = 'Retained host mutation';
      expect(current().input.structured_data.user_defined).toEqual({
        value: 'after',
        transport: 'accepted',
      });
      expect(mount.instance.state.get().status).toBe('ready');
    } finally {
      mount.instance.off([preSend, afterSend]);
      try {
        await act(() => mount.instance.serviceDesk.endConversation());
      } finally {
        await act(async () => mount.unmount());
      }
    }
  });
});
