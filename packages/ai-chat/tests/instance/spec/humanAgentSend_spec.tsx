/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Specs for the human-agent send path: display_content and structured_data
 * are populated on the MessageRequest handed to the service desk.
 *
 * Behaviours covered:
 *  1. Renderable display content (a mention chip, or text) reaches
 *     input.display_content; an empty doc is dropped rather than carried.
 *  2. Structured data staged on the human-agent slice reaches
 *     input.structured_data.
 *  3. Pending structured data is cleared after send, so a second message
 *     cannot inherit the first send's picks (leak regression).
 *  4. human_agent:pre:send fires with both fields already populated.
 *  5. The send clears only the human-agent slice; the assistant slice keeps
 *     its own staged data.
 *  6. useInputCallbacks forwards the editor's display content into
 *     sendMessageToAgent — the wiring the impl-level specs cannot see.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import {
  createBaseConfig,
  mockCustomSendMessage,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';
import { HumanAgentServiceImpl } from '../../../src/chat/services/haa/HumanAgentServiceImpl';
import { useInputCallbacks } from '../../../src/chat/hooks/useInputCallbacks';
import { StoreProvider } from '../../../src/chat/providers/StoreProvider';
import {
  BusEventType,
  MessageSendSource,
} from '../../../src/types/events/eventBusTypes';
import actions from '../../../src/chat/store/actions';
import type { StructuredData } from '../../../src/types/messaging/Messages';
import type { ServiceDesk } from '../../../src/types/config/ServiceDeskConfig';
import type { JSONContent } from '@tiptap/core';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * A doc holding a mention chip. Chips are custom nodes, so they render on their
 * own — this is the branch of isRenderableDisplayNode that plain text misses.
 */
const MENTION_DOC: JSONContent = {
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

/** A doc holding nothing but text. Renderable via the text branch. */
const TEXT_DOC: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello ' }] }],
};

/**
 * The docs the prompt-line emits when there is nothing to render. It emits one
 * on every change — including the wipe that follows a send — so these must be
 * dropped, or a following file-only send carries an empty doc to the host.
 */
const EMPTY_DOCS: [string, JSONContent][] = [
  ['a doc with no content', { type: 'doc', content: [] }],
  [
    'a doc holding one empty paragraph',
    { type: 'doc', content: [{ type: 'paragraph' }] },
  ],
  [
    'a doc holding only whitespace',
    {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: '   ' }] },
      ],
    },
  ],
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a stub ServiceDesk whose sendMessageToAgent resolves immediately and
 * captures every call for later assertion.
 */
function makeStubServiceDesk(): {
  serviceDesk: ServiceDesk;
  sendMessageToAgent: jest.Mock;
} {
  const sendMessageToAgent = jest.fn().mockResolvedValue(undefined);
  const serviceDesk = {
    getName: () => 'stub-desk',
    startChat: jest.fn().mockResolvedValue(undefined),
    endChat: jest.fn().mockResolvedValue(undefined),
    sendMessageToAgent,
  } as unknown as ServiceDesk;
  return { serviceDesk, sendMessageToAgent };
}

/**
 * Renders the chat, wires a stub service desk into a HumanAgentServiceImpl, and
 * marks the store connected — the minimal setup that exercises the human-agent
 * send path without running startChat.
 *
 * The impl reads `humanAgentState.inputState` and clears it by explicit flag, so
 * it never consults `selectIsInputToHumanAgent`. The connected dispatch is here
 * for `useInputCallbacks`, which routes on that selector.
 */
async function setupHumanAgentChat() {
  const config = createBaseConfig();
  const { instance, store, serviceManager } =
    await renderChatAndGetInstanceWithStore(config);

  // `instance.serviceManager` is a rest-spread copy built for tests
  // (ChatInstanceImpl drops the circular `instance` ref), so it is a plain
  // object: the prototype — and with it `fire` — does not survive. Put `fire`
  // back, wired to the real event bus, or the pre:send dispatch throws.
  (serviceManager as any).instance = instance;
  (serviceManager as any).fire = (busEvent: any) =>
    serviceManager.eventBus.fire(busEvent, instance);

  const { serviceDesk, sendMessageToAgent } = makeStubServiceDesk();
  const impl = new HumanAgentServiceImpl(serviceManager);
  (impl as any).serviceDesk = serviceDesk;
  (impl as any).chatStarted = true;

  (serviceManager as any).humanAgentService = impl;

  act(() => {
    store.dispatch(
      actions.changeState({
        persistedToBrowserStorage: {
          humanAgentState: { isConnected: true },
        },
      })
    );
  });

  return { instance, store, serviceManager, impl, sendMessageToAgent };
}

/**
 * Flips the store's connected flag. The first `instance.send` runs hydration,
 * which resets this — so anything routing on it must set it again afterwards.
 */
function setConnected(store: any, isConnected: boolean) {
  act(() => {
    store.dispatch(
      actions.changeState({
        persistedToBrowserStorage: { humanAgentState: { isConnected } },
      })
    );
  });
}

/** Stages structured data on the human-agent input slice. */
function stageHumanAgentData(store: any, data: StructuredData) {
  act(() => {
    store.dispatch(actions.updateStructuredData(data, true));
  });
}

/** Stages structured data on the assistant input slice. */
function stageAssistantData(store: any, data: StructuredData) {
  act(() => {
    store.dispatch(actions.updateStructuredData(data, false));
  });
}

/** The most recent MessageRequest handed to the assistant's customSendMessage. */
function lastAssistantMessage() {
  const { calls } = mockCustomSendMessage.mock;
  return calls[calls.length - 1][0];
}

/** The MessageRequest handed to the service desk on the nth call. */
function sentMessage(sendMessageToAgent: jest.Mock, call = 0) {
  return sendMessageToAgent.mock.calls[call][0];
}

// ---------------------------------------------------------------------------
// Specs
// ---------------------------------------------------------------------------

describe('human-agent send path — display_content and structured_data', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  // -------------------------------------------------------------------------
  // display_content
  // -------------------------------------------------------------------------

  describe('display_content', () => {
    it('carries a doc holding a mention chip', async () => {
      const { impl, sendMessageToAgent } = await setupHumanAgentChat();

      await impl.sendMessageToAgent('Hey Dana', [], MENTION_DOC);

      expect(sendMessageToAgent).toHaveBeenCalledTimes(1);
      expect(sentMessage(sendMessageToAgent).input.text).toBe('Hey Dana');
      expect(sentMessage(sendMessageToAgent).input.display_content).toEqual(
        MENTION_DOC
      );
    });

    it('carries a doc holding only text', async () => {
      const { impl, sendMessageToAgent } = await setupHumanAgentChat();

      await impl.sendMessageToAgent('Hello world', [], TEXT_DOC);

      expect(sentMessage(sendMessageToAgent).input.display_content).toEqual(
        TEXT_DOC
      );
    });

    it('omits display_content when none is passed', async () => {
      const { impl, sendMessageToAgent } = await setupHumanAgentChat();

      await impl.sendMessageToAgent('Plain text', [], undefined);

      expect(
        sentMessage(sendMessageToAgent).input.display_content
      ).toBeUndefined();
    });

    it.each(EMPTY_DOCS)('drops %s', async (_label, emptyDoc) => {
      const { impl, sendMessageToAgent } = await setupHumanAgentChat();

      await impl.sendMessageToAgent('Attachment only', [], emptyDoc);

      expect(
        sentMessage(sendMessageToAgent).input.display_content
      ).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // structured_data
  // -------------------------------------------------------------------------

  describe('structured_data', () => {
    it('is taken from pending data on the human-agent slice', async () => {
      const { store, impl, sendMessageToAgent } = await setupHumanAgentChat();
      const structuredData: StructuredData = {
        fields: [{ id: 'intent', value: 'billing' }],
      };

      stageHumanAgentData(store, structuredData);
      await impl.sendMessageToAgent('Help me', [], undefined);

      expect(sendMessageToAgent).toHaveBeenCalledTimes(1);
      expect(sentMessage(sendMessageToAgent).input.structured_data).toEqual(
        structuredData
      );
    });

    it('is omitted when nothing is staged', async () => {
      const { impl, sendMessageToAgent } = await setupHumanAgentChat();

      await impl.sendMessageToAgent('No picks', [], undefined);

      expect(
        sentMessage(sendMessageToAgent).input.structured_data
      ).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Leak regression
  // -------------------------------------------------------------------------

  describe('clearing after send', () => {
    it('clears the human-agent pending structured data', async () => {
      const { store, impl } = await setupHumanAgentChat();

      stageHumanAgentData(store, {
        fields: [{ id: 'topic', value: 'returns' }],
      });
      expect(
        store.getState().humanAgentState.inputState.pendingStructuredData
      ).toBeDefined();

      await impl.sendMessageToAgent('First message', [], undefined);

      expect(
        store.getState().humanAgentState.inputState.pendingStructuredData
      ).toBeUndefined();
    });

    it('does not let a second send inherit the first send picks', async () => {
      const { store, impl, sendMessageToAgent } = await setupHumanAgentChat();

      stageHumanAgentData(store, { fields: [{ id: 'x', value: 1 }] });

      await impl.sendMessageToAgent('First message', [], undefined);
      await impl.sendMessageToAgent('Second message', [], undefined);

      expect(sendMessageToAgent).toHaveBeenCalledTimes(2);
      expect(sentMessage(sendMessageToAgent, 0).input.structured_data).toEqual({
        fields: [{ id: 'x', value: 1 }],
      });
      expect(
        sentMessage(sendMessageToAgent, 1).input.structured_data
      ).toBeUndefined();
    });

    it('leaves the assistant slice staged data untouched', async () => {
      const { store, impl } = await setupHumanAgentChat();
      const assistantData: StructuredData = {
        fields: [{ id: 'assistant_field', value: 'assistant' }],
      };

      stageAssistantData(store, assistantData);
      stageHumanAgentData(store, {
        fields: [{ id: 'agent_field', value: 'agent' }],
      });

      await impl.sendMessageToAgent('Message to agent', [], undefined);

      expect(
        store.getState().humanAgentState.inputState.pendingStructuredData
      ).toBeUndefined();
      // The two slices are independent: sending to the agent must not consume
      // what the user staged for the assistant.
      expect(
        store.getState().assistantInputState.pendingStructuredData
      ).toEqual(assistantData);
    });
  });

  // -------------------------------------------------------------------------
  // pre:send ordering
  // -------------------------------------------------------------------------

  describe('human_agent:pre:send', () => {
    it('fires with display_content and structured_data already populated', async () => {
      const { store, instance, impl } = await setupHumanAgentChat();
      const structuredData: StructuredData = {
        fields: [{ id: 'department', value: 'support' }],
      };

      stageHumanAgentData(store, structuredData);

      const preSendPayloads: any[] = [];
      instance.on([
        {
          type: BusEventType.HUMAN_AGENT_PRE_SEND,
          handler: (event: any) => {
            preSendPayloads.push(event.data);
          },
        },
      ]);

      await impl.sendMessageToAgent('Hi', [], MENTION_DOC);

      expect(preSendPayloads).toHaveLength(1);
      expect(preSendPayloads[0].input.display_content).toEqual(MENTION_DOC);
      expect(preSendPayloads[0].input.structured_data).toEqual(structuredData);
    });

    it('lets a handler rewrite both fields before the service desk sees them', async () => {
      const { store, instance, impl, sendMessageToAgent } =
        await setupHumanAgentChat();

      stageHumanAgentData(store, {
        fields: [{ id: 'staged', value: 'store' }],
      });

      instance.on([
        {
          type: BusEventType.HUMAN_AGENT_PRE_SEND,
          handler: (event: any) => {
            event.data.input.structured_data = {
              fields: [{ id: 'handler_field', value: 'from handler' }],
            };
            event.data.input.display_content = TEXT_DOC;
          },
        },
      ]);

      await impl.sendMessageToAgent('My message', [], MENTION_DOC);

      const message = sentMessage(sendMessageToAgent);
      expect(message.input.structured_data.fields[0].id).toBe('handler_field');
      expect(message.input.display_content).toEqual(TEXT_DOC);
    });
  });

  // -------------------------------------------------------------------------
  // Precedence, and the escalation boundary
  // -------------------------------------------------------------------------

  describe('while connected to an agent', () => {
    it('does not overwrite structured_data set by the caller', async () => {
      const { instance, store } = await setupHumanAgentChat();

      // The first send runs hydration, which clears the connected flag. Get
      // that out of the way, then set up the state this test is about.
      await instance.send('warm up hydration');
      setConnected(store, true);
      stageHumanAgentData(store, {
        fields: [{ id: 'staged', value: 'from the slice' }],
      });

      await instance.send({
        input: {
          text: 'Explicit picks',
          structured_data: {
            fields: [{ id: 'explicit', value: 'from the caller' }],
          },
        },
      } as any);

      // The agent slice holds picks, but the caller set its own. The caller wins.
      const sent = lastAssistantMessage();
      expect(sent.input.text).toBe('Explicit picks');
      expect(sent.input.structured_data.fields[0].id).toBe('explicit');
    });

    it('leaves the assistant its own picks after the agent chat ends', async () => {
      const { instance, store, impl } = await setupHumanAgentChat();
      const assistantData: StructuredData = {
        fields: [{ id: 'assistant_field', value: 'assistant' }],
      };

      stageAssistantData(store, assistantData);
      stageHumanAgentData(store, {
        fields: [{ id: 'agent_field', value: 'agent' }],
      });

      await impl.sendMessageToAgent('To the agent', [], MENTION_DOC);

      await act(async () => {
        await impl.endChat(true);
      });

      await instance.send('To the assistant');

      // The escalation consumed the agent's picks and left the assistant's alone.
      const sent = lastAssistantMessage();
      expect(sent.input.text).toBe('To the assistant');
      expect(sent.input.structured_data).toEqual(assistantData);
      expect(sent.input.display_content).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // The wiring from the input to the service
  // -------------------------------------------------------------------------

  describe('useInputCallbacks wiring', () => {
    it('forwards the editor display content into sendMessageToAgent', async () => {
      const { store, serviceManager, sendMessageToAgent } =
        await setupHumanAgentChat();

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <StoreProvider store={store}>{children}</StoreProvider>
      );

      const { result } = renderHook(
        () =>
          useInputCallbacks({
            serviceManager,
            agentDisplayState: {
              isConnectingOrConnected: true,
              disableInput: false,
            },
            isHydrated: true,
            messagesRef: { current: null },
            humanAgentFileUploadInProgress: false,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.onSendInput(
          'Hey Dana',
          MessageSendSource.MESSAGE_INPUT,
          undefined,
          MENTION_DOC
        );
      });

      // onSendInput does not await the human-agent send, so wait for it.
      await waitFor(() => expect(sendMessageToAgent).toHaveBeenCalledTimes(1));
      expect(sentMessage(sendMessageToAgent).input.display_content).toEqual(
        MENTION_DOC
      );
    });
  });
});
