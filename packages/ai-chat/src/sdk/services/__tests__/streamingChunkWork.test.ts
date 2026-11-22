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

import { EventBus } from '../../events/EventBus';
import { PublicStateService } from '../PublicStateService';
import type { ServiceManager } from '../ServiceManager';
import actions from '../../store/actions';
import type { LocalMessageItem } from '../../../types/messaging/LocalMessageItem';
import {
  type Message,
  type MessageResponse,
  MessageResponseTypes,
  type TextItem,
} from '../../../types/messaging/Messages';
import {
  createBaseConfig,
  makeConfigStore,
} from '../../../chat/__tests__/helpers/chat';

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

  /** The text of each response's first item, in `messages` and in `messageItems`. */
});
