/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { LocalMessageItem } from '../../../src/types/messaging/LocalMessageItem';
import {
  Message,
  MessageRequest,
  MessageResponse,
  MessageResponseTypes,
  TextItem,
} from '../../../src/types/messaging/Messages';
import { PublicMessagesProjection } from '../../../src/chat/utils/publicMessages';

function localItem(
  fullMessageID: string,
  id: string,
  item: LocalMessageItem['item'],
  chunks?: LocalMessageItem['ui_state']['streamingState']['chunks']
): LocalMessageItem {
  return {
    fullMessageID,
    item,
    ui_state: {
      id: `${fullMessageID}-${id}`,
      streamingState: chunks ? { chunks, isDone: false } : undefined,
    },
  };
}

describe('public message state', () => {
  it('projects stored messages in canonical order, including silent and human-agent messages', () => {
    const projection = new PublicMessagesProjection();
    const messages: Record<string, Message> = {
      assistant: {
        id: 'assistant',
        output: { generic: [] },
      },
      silent: {
        id: 'silent',
        input: { text: 'hidden' },
        history: { silent: true },
      },
      agent: {
        id: 'agent',
        input: { text: 'human', agent_message_type: 'from_agent' },
      } as Message,
    };

    expect(projection.project([], {}, {}, [])).toEqual([]);
    expect(
      projection
        .project(['silent', 'assistant', 'agent'], messages, {}, [])
        .map((message) => message.id)
    ).toEqual(['silent', 'assistant', 'agent']);
  });

  it('overlays partial text and non-text items in response order', () => {
    const projection = new PublicMessagesProjection();
    const message: Message = {
      id: 'response',
      output: { generic: [] },
      context: { retained: true },
    };
    const text = localItem(
      'response',
      'text',
      {
        response_type: MessageResponseTypes.TEXT,
        text: '',
        streaming_metadata: { id: 'text' },
      },
      [{ text: 'Hello ' }, { text: 'world' }]
    );
    const userDefined = localItem(
      'response',
      'custom',
      {
        response_type: MessageResponseTypes.USER_DEFINED,
        user_defined: { initial: true },
        streaming_metadata: { id: 'custom' },
      },
      [{ user_defined: { current: true } }]
    );

    const [result] = projection.project(
      ['response'],
      { response: message },
      {
        [text.ui_state.id]: text,
        [userDefined.ui_state.id]: userDefined,
      },
      [text.ui_state.id, userDefined.ui_state.id]
    );

    expect(result).toMatchObject({
      context: { retained: true },
      output: {
        generic: [
          { response_type: 'text', text: 'Hello world' },
          {
            response_type: 'user_defined',
            user_defined: { initial: true, current: true },
          },
        ],
      },
    });
  });

  it('keeps stable references for unchanged content and fixed old snapshots', () => {
    const projection = new PublicMessagesProjection();
    const message: Message = {
      id: 'response',
      output: {
        generic: [{ response_type: MessageResponseTypes.TEXT, text: 'First' }],
      },
    };
    const item = localItem('response', 'text', message.output.generic[0]);
    const first = projection.project(
      ['response'],
      { response: message },
      { [item.ui_state.id]: item },
      [item.ui_state.id]
    );
    const statusOnlyItem = {
      ...item,
      ui_state: { ...item.ui_state, needsAnnouncement: true },
    };
    const statusOnly = projection.project(
      ['response'],
      { response: message },
      { [item.ui_state.id]: statusOnlyItem },
      [item.ui_state.id]
    );

    expect(statusOnly).toBe(first);
    expect(statusOnly[0]).toBe(first[0]);

    (message.output.generic[0] as TextItem).text = 'mutated source';
    expect(
      ((first[0] as Readonly<MessageResponse>).output.generic[0] as TextItem)
        .text
    ).toBe('First');

    const changedMessage: Message = {
      ...message,
      output: {
        generic: [{ response_type: MessageResponseTypes.TEXT, text: 'Second' }],
      },
    };
    const changed = projection.project(
      ['response'],
      { response: changedMessage },
      {},
      []
    );
    expect(changed).not.toBe(first);
    expect(changed[0]).not.toBe(first[0]);
    expect(
      ((first[0] as Readonly<MessageResponse>).output.generic[0] as TextItem)
        .text
    ).toBe('First');
  });

  it('reuses newer message and array versions after an older version is read', () => {
    const projection = new PublicMessagesProjection();
    const firstMessage: Message = {
      id: 'response',
      output: {
        generic: [{ response_type: MessageResponseTypes.TEXT, text: 'First' }],
      },
    };
    const secondMessage: Message = {
      ...firstMessage,
      output: {
        generic: [{ response_type: MessageResponseTypes.TEXT, text: 'Second' }],
      },
    };
    const preparedFirst = projection.prepare(
      ['response'],
      { response: firstMessage },
      {},
      []
    );
    const preparedSecond = projection.prepare(
      ['response'],
      { response: secondMessage },
      {},
      []
    );
    const second = preparedSecond.get();

    expect(preparedFirst.get()[0]).toMatchObject({ id: 'response' });
    const secondAgain = projection.project(
      ['response'],
      { response: secondMessage },
      {},
      []
    );
    expect(secondAgain).toBe(second);
    expect(secondAgain[0]).toBe(second[0]);
  });

  it('freezes public clones and removes only private message fields', () => {
    const projection = new PublicMessagesProjection();
    const source = {
      id: 'request',
      input: { text: 'hello', metadata: { ui_state: 'keep' } },
      context: { ui_state_internal: 'keep' },
      history: { timestamp: 1, file_upload_status: 'complete' },
      ui_state_internal: { from_history: true },
      ui_state: { local: true },
    } as unknown as Message;

    const messages = projection.project(
      ['request'],
      { request: source },
      {},
      []
    );
    const result = messages[0] as Readonly<MessageRequest> & {
      ui_state?: unknown;
    };

    expect(Object.isFrozen(messages)).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.input)).toBe(true);
    expect(result).not.toHaveProperty('ui_state_internal');
    expect(result).not.toHaveProperty('ui_state');
    expect(result.history).not.toHaveProperty('file_upload_status');
    expect(result.context).toEqual({ ui_state_internal: 'keep' });
    expect((result.input as { metadata: unknown }).metadata).toEqual({
      ui_state: 'keep',
    });
    expect(Object.isFrozen(source)).toBe(false);
    expect(source.history).toHaveProperty('file_upload_status');
  });

  it('drops removed cache entries and replaces reused IDs with new history data', () => {
    const projection = new PublicMessagesProjection();
    const oldMessage: Message = { id: 'same', input: { text: 'old' } };
    const oldMessages = projection.project(
      ['same'],
      { same: oldMessage },
      {},
      []
    );

    expect(projection.project([], {}, {}, [])).toEqual([]);
    const cache = projection as unknown as {
      messages: Map<string, unknown>;
    };
    expect(cache.messages.size).toBe(0);

    const replacement: Message = { id: 'same', input: { text: 'new' } };
    const newMessages = projection.project(
      ['same'],
      { same: replacement },
      {},
      []
    );
    expect(newMessages[0]).not.toBe(oldMessages[0]);
    expect((newMessages[0] as Readonly<MessageRequest>).input.text).toBe('new');
  });
});
