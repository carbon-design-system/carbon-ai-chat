/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The public state's work for one streamed chunk doesn't grow with the transcript. A chunk writer
 * records which keys it changed, so `messages` and `messageItems` compare only the message the
 * chunk changed. Each case counts the fields projected and the messages compared for one chunk.
 */

import { EventBus } from '../../../src/sdk/events/EventBus';
import { PublicStateService } from '../../../src/sdk/services/PublicStateService';
import type { ServiceManager } from '../../../src/sdk/services/ServiceManager';
import actions from '../../../src/sdk/store/actions';
import type { LocalMessageItem } from '../../../src/types/messaging/LocalMessageItem';
import {
  type Message,
  type MessageResponse,
  MessageResponseTypes,
  type TextItem,
} from '../../../src/types/messaging/Messages';
import { createBaseConfig, makeConfigStore } from '../../test_helpers';

const LIVE = 'live';

/**
 * A chat whose transcript holds `prior` responses. Unless `read` is false, a listener reads both
 * message fields on each change, as the mounted list does.
 */
function chatWith(prior: number, read = true) {
  const work: string[] = [];
  const store = makeConfigStore(createBaseConfig());
  const serviceManager = {
    store,
    eventBus: new EventBus(),
    instance: {},
  } as unknown as ServiceManager;
  const service = new PublicStateService(serviceManager, {
    onProject: (field) => work.push(`project ${field}`),
    onCompareMessage: (field) => work.push(`compare ${field}`),
  });
  serviceManager.publicStateService = service;

  const messages: Record<string, Message> = {};
  const items: Record<string, LocalMessageItem> = {};
  for (let index = 0; index < prior; index++) {
    const id = `response-${index}`;
    const item: TextItem = {
      response_type: MessageResponseTypes.TEXT,
      text: `Answer ${index}`,
    };
    messages[id] = { id, output: { generic: [item] } };
    items[`${id}-local`] = {
      fullMessageID: id,
      item,
      ui_state: { id: `${id}-local` },
    };
  }
  store.dispatch(
    actions.changeState({
      allMessagesByID: messages,
      allMessageItemsByID: items,
      assistantMessageState: {
        messageIDs: Object.keys(messages),
        localMessageIDs: Object.keys(items),
      },
    })
  );
  if (read) {
    service.subscribe(() => {
      const { messages, messageItems } = service.get();
      return [messages, messageItems];
    });
  }
  return { service, serviceManager, store, work };
}

/**
 * Writes one chunk of `text` into item `streamID` of the response `responseID`, the live one by
 * default, as `addMessageChunk` does.
 */
function chunk(
  store: ReturnType<typeof makeConfigStore>,
  streamID: string,
  text: string,
  responseID = LIVE
) {
  const message = store.getState().allMessagesByID[responseID] ?? {
    id: responseID,
    output: { generic: [] },
  };
  store.dispatch(
    actions.upsertMessage(message as MessageResponse, true, undefined, {
      origin: 'chunk',
      chunk: {
        item: {
          response_type: MessageResponseTypes.TEXT,
          text,
          streaming_metadata: { id: streamID },
        },
        isComplete: false,
      },
    })
  );
}

/** The work one chunk into a streaming item causes, after `prior` responses. */
function workForOneChunk(prior: number) {
  const { service, store, work } = chatWith(prior);
  chunk(store, 'a', 'First');
  chunk(store, 'b', 'Second');
  chunk(store, 'a', ' part');
  work.length = 0;

  chunk(store, 'a', ' and more');

  const state = service.get();
  const live = state.messages.find(({ id }) => id === LIVE) as MessageResponse;
  expect(live.output.generic.map((item) => (item as TextItem).text)).toEqual([
    'First part and more',
    'Second',
  ]);
  expect(state.messageItems).toHaveLength(prior + 2);
  return work;
}

describe('the work for one streamed chunk', () => {
  it('is the same after 10 and after 1,000 earlier messages', () => {
    const short = workForOneChunk(10);
    const long = workForOneChunk(1000);

    expect(long).toEqual(short);
    // Each field projects once, and compares the one message the chunk changed.
    expect(short.filter((step) => step === 'project messages')).toHaveLength(1);
    expect(short.filter((step) => step === 'compare messages')).toHaveLength(1);
    expect(
      short.filter((step) => step === 'project messageItems')
    ).toHaveLength(1);
    // The live response has two top-level items, and its item IDs depend on both.
    expect(
      short.filter((step) => step === 'compare messageItems')
    ).toHaveLength(2);
  });

  it('keeps every other message and item when the chunk changes one', () => {
    const { service, store } = chatWith(3);
    chunk(store, 'a', 'First');
    chunk(store, 'b', 'Second');
    const before = service.get();

    chunk(store, 'b', ' more');
    const after = service.get();

    after.messages
      .slice(0, 3)
      .forEach((message, index) =>
        expect(message).toBe(before.messages[index])
      );
    expect(after.messageItems.slice(0, 4)).toEqual(
      before.messageItems.slice(0, 4)
    );
    after.messageItems
      .slice(0, 4)
      .forEach((entry, index) =>
        expect(entry).toBe(before.messageItems[index])
      );
    expect(after.messageItems[4]).not.toBe(before.messageItems[4]);
    expect(after.messageItems[4].item).toMatchObject({ text: 'Second more' });
  });

  it('compares every message after a write that names no changed keys, and stays current', () => {
    const { service, store, work } = chatWith(3);
    chunk(store, 'a', 'First');
    service.get();
    work.length = 0;

    const earlier = store.getState().allMessagesByID['response-1'];
    store.dispatch(
      actions.changeState({
        allMessagesByID: {
          ...store.getState().allMessagesByID,
          'response-1': { ...earlier, history: { label: 'Edited' } },
        },
      })
    );
    chunk(store, 'a', ' more');

    const state = service.get();
    expect(work.filter((step) => step === 'compare messages').length).toBe(
      // The edit compares all four messages; the chunk after it, one.
      5
    );
    expect(state.messages[1].history).toEqual({ label: 'Edited' });
    expect(
      (state.messages[3] as MessageResponse).output.generic[0]
    ).toMatchObject({ text: 'First more' });
  });

  /** The text of each response's first item, in `messages` and in `messageItems`. */
  function textsOf(service: PublicStateService, responseIDs: string[]) {
    const { messages, messageItems } = service.get();
    return responseIDs.map((id) => {
      const message = messages.find(
        (each) => each.id === id
      ) as MessageResponse;
      const entry = messageItems.find(({ messageID }) => messageID === id);
      return [
        (message.output.generic[0] as TextItem).text,
        (entry.item as TextItem).text,
      ];
    });
  }

  it.each([
    ['more writes behind than are recorded', 100],
    ['a few writes behind', 10],
  ])(
    'keeps a reader %s current, including an early write to another stream',
    (_case, writes) => {
      const { service, serviceManager, store } = chatWith(3, false);
      chunk(store, 'a', 'Other ', 'other');
      chunk(store, 'a', '');
      // Another reader of the same store reads every change, so it never falls behind.
      const everyChange = new PublicStateService(serviceManager);
      everyChange.subscribe(() => everyChange.get().messageItems);
      const stale = service.get();

      chunk(store, 'a', 'EARLY', 'other');
      for (let index = 0; index < writes; index++) {
        chunk(store, 'a', `${index % 10}`);
      }

      const liveText = Array.from(
        { length: writes },
        (_, index) => index % 10
      ).join('');
      const expected = [
        ['Other EARLY', 'Other EARLY'],
        [liveText, liveText],
      ];
      expect(stale.messages).toHaveLength(5);
      expect(textsOf(service, ['other', LIVE])).toEqual(expected);
      expect(textsOf(everyChange, ['other', LIVE])).toEqual(expected);
      expect(service.get().messages).toEqual(everyChange.get().messages);
      expect(service.get().messageItems).toEqual(
        everyChange.get().messageItems
      );
      everyChange.destroy();
    }
  );
});
