/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createAppStore } from '../../../src/chat/store/appStore';
import {
  buildLanguagePack,
  createAppConfig,
} from '../../../src/chat/store/doCreateStore';
import actions from '../../../src/chat/store/actions';
import { reducers } from '../../../src/chat/store/reducers';
import { AppState } from '../../../src/types/state/AppState';
import {
  DEFAULT_CITATION_PANEL_STATE,
  DEFAULT_CUSTOM_PANEL_STATE,
  DEFAULT_WORKSPACE_PANEL_STATE,
  DEFAULT_HISTORY_PANEL_STATE,
  DEFAULT_IFRAME_PANEL_STATE,
  DEFAULT_INPUT_STATE,
  DEFAULT_MESSAGE_PANEL_STATE,
  DEFAULT_CHAT_MESSAGES_STATE,
  DEFAULT_PERSISTED_TO_BROWSER,
  DEFAULT_HUMAN_AGENT_STATE,
  VIEW_STATE_ALL_CLOSED,
} from '../../../src/chat/store/reducerUtils';
import {
  CardItem,
  MessageResponse,
  MessageResponseTypes,
  PauseItem,
  TextItem,
} from '../../../src/types/messaging/Messages';
import { LocalMessageItem } from '../../../src/types/messaging/LocalMessageItem';
import { HumanAgentsOnlineStatus } from '../../../src/types/config/ServiceDeskConfig';
import { deriveStreamingItemText } from '../../../src/chat/utils/streamingUtils';

function rootReducer(
  state: AppState,
  action: { type: string; [key: string]: unknown } | undefined
): AppState {
  return action && reducers[action.type]
    ? reducers[action.type](state, action)
    : state;
}

function createInitialAppState(): AppState {
  const config = createAppConfig({});
  return {
    config,
    languagePack: buildLanguagePack(config.public.strings),
    allMessageItemsByID: {},
    allMessagesByID: {},
    targetViewState: VIEW_STATE_ALL_CLOSED,
    viewChanging: false,
    assistantMessageState: DEFAULT_CHAT_MESSAGES_STATE,
    isHydrated: false,
    suspendScrollDetection: false,
    showNonHeaderBackgroundCover: false,
    isRestarting: false,
    isBrowserPageVisible: true,
    chatWidthBreakpoint: null,
    chatWidth: null,
    chatHeight: null,
    assistantInputState: DEFAULT_INPUT_STATE,
    humanAgentState: DEFAULT_HUMAN_AGENT_STATE,
    persistedToBrowserStorage: {
      ...DEFAULT_PERSISTED_TO_BROWSER,
      homeScreenState: { isHomeScreenOpen: false, showBackToAssistant: false },
    },
    viewSourcePanelState: DEFAULT_CITATION_PANEL_STATE,
    iFramePanelState: DEFAULT_IFRAME_PANEL_STATE,
    customPanelState: DEFAULT_CUSTOM_PANEL_STATE,
    workspacePanelState: DEFAULT_WORKSPACE_PANEL_STATE,
    historyPanelState: DEFAULT_HISTORY_PANEL_STATE,
    responsePanelState: DEFAULT_MESSAGE_PANEL_STATE,
    announceMessage: undefined,
    initialViewChangeComplete: false,
  };
}

function makeTextResponse(
  id: string,
  texts: string[],
  streamingIds?: string[]
): MessageResponse {
  return {
    id,
    output: {
      generic: texts.map((text, i) => ({
        response_type: MessageResponseTypes.TEXT,
        text,
        ...(streamingIds?.[i]
          ? { streaming_metadata: { id: streamingIds[i] } }
          : {}),
      })),
    },
  };
}

function localItemsForMessage(state: AppState, messageID: string) {
  return state.assistantMessageState.localMessageIDs
    .map((id) => state.allMessageItemsByID[id])
    .filter((item) => item && item.fullMessageID === messageID);
}

describe('[UPSERT_MESSAGE] reducer', () => {
  let store: ReturnType<typeof createAppStore>;

  beforeEach(() => {
    store = createAppStore(rootReducer, createInitialAppState());
  });

  it('inserts a brand-new message and its local items', () => {
    const message = makeTextResponse('m1', ['hello']);

    store.dispatch(actions.upsertMessage(message));
    const state = store.getState() as AppState;

    expect(state.allMessagesByID['m1']).toBe(message);
    expect(state.assistantMessageState.messageIDs).toEqual(['m1']);
    expect(state.assistantMessageState.activeResponseId).toBe('m1');
    const locals = localItemsForMessage(state, 'm1');
    expect(locals).toHaveLength(1);
    expect((locals[0].item as any).text).toBe('hello');
  });

  it('preserves position in messageIDs[] across re-upserts', () => {
    store.dispatch(actions.upsertMessage(makeTextResponse('m1', ['one'])));
    store.dispatch(actions.upsertMessage(makeTextResponse('m2', ['two'])));
    store.dispatch(actions.upsertMessage(makeTextResponse('m3', ['three'])));

    // Re-upsert m2 with new text.
    store.dispatch(actions.upsertMessage(makeTextResponse('m2', ['TWO'])));

    const state = store.getState() as AppState;
    expect(state.assistantMessageState.messageIDs).toEqual(['m1', 'm2', 'm3']);
    const locals = localItemsForMessage(state, 'm2');
    expect(locals).toHaveLength(1);
    expect((locals[0].item as any).text).toBe('TWO');
  });

  it('reuses the LocalMessageItem reference verbatim when an item is deep-equal', () => {
    const first = makeTextResponse('m1', ['alpha', 'beta'], ['a', 'b']);
    store.dispatch(actions.upsertMessage(first));

    const stateBefore = store.getState() as AppState;
    const localsBefore = localItemsForMessage(stateBefore, 'm1');
    expect(localsBefore).toHaveLength(2);
    const refAlphaBefore = localsBefore[0];
    const refBetaBefore = localsBefore[1];

    // Re-upsert with the second item changed. The first item is deep-equal to the
    // previous, so its LocalMessageItem reference must be reused verbatim.
    const second = makeTextResponse('m1', ['alpha', 'BETA-2'], ['a', 'b']);
    store.dispatch(actions.upsertMessage(second));

    const stateAfter = store.getState() as AppState;
    const localsAfter = localItemsForMessage(stateAfter, 'm1');
    expect(localsAfter).toHaveLength(2);

    // Reference stability — sibling did not change, reference must be identical.
    expect(Object.is(localsAfter[0], refAlphaBefore)).toBe(true);

    // Changed item gets a new object reference.
    expect(Object.is(localsAfter[1], refBetaBefore)).toBe(false);
    expect((localsAfter[1].item as any).text).toBe('BETA-2');

    // IDs are stable (streaming-id match).
    expect(localsAfter[0].ui_state.id).toBe(refAlphaBefore.ui_state.id);
    expect(localsAfter[1].ui_state.id).toBe(refBetaBefore.ui_state.id);
  });

  it('reuses local item ids positionally when no streaming_metadata.id is present', () => {
    const first = makeTextResponse('m1', ['alpha', 'beta']);
    store.dispatch(actions.upsertMessage(first));

    const stateBefore = store.getState() as AppState;
    const localsBefore = localItemsForMessage(stateBefore, 'm1');
    const firstIDBefore = localsBefore[0].ui_state.id;
    const secondIDBefore = localsBefore[1].ui_state.id;

    const second = makeTextResponse('m1', ['alpha', 'BETA-2']);
    store.dispatch(actions.upsertMessage(second));

    const stateAfter = store.getState() as AppState;
    const localsAfter = localItemsForMessage(stateAfter, 'm1');
    expect(localsAfter[0].ui_state.id).toBe(firstIDBefore);
    expect(localsAfter[1].ui_state.id).toBe(secondIDBefore);
    // Reference stable for unchanged item.
    expect(Object.is(localsAfter[0], localsBefore[0])).toBe(true);
  });

  it('keeps the same allMessagesByID reference when nothing changed', () => {
    const message = makeTextResponse('m1', ['alpha'], ['a']);
    store.dispatch(actions.upsertMessage(message));
    const stateBefore = store.getState() as AppState;
    const messageRefBefore = stateBefore.allMessagesByID['m1'];

    // Re-upsert with deep-equal content — should reuse the existing reference.
    store.dispatch(
      actions.upsertMessage(makeTextResponse('m1', ['alpha'], ['a']))
    );
    const stateAfter = store.getState() as AppState;
    expect(stateAfter.allMessagesByID['m1']).toBe(messageRefBefore);
  });

  it("keeps the chat's own ui_state_internal when the upserted message leaves it out", () => {
    store.dispatch(actions.upsertMessage(makeTextResponse('m1', ['alpha'])));
    store.dispatch(
      actions.setMessageUIStateInternalProperty(
        'm1',
        'agent_availability',
        HumanAgentsOnlineStatus.ONLINE
      )
    );

    // A host updater that ignores the previous message.
    const next: MessageResponse = {
      ...makeTextResponse('m1', ['beta']),
      ui_state_internal: { from_history: false },
    };
    store.dispatch(actions.upsertMessage(next));

    const stored = (store.getState() as AppState).allMessagesByID['m1'];
    expect(stored.ui_state_internal).toEqual({
      from_history: false,
      agent_availability: HumanAgentsOnlineStatus.ONLINE,
    });
    // The host's own object is left alone.
    expect(next.ui_state_internal).toEqual({ from_history: false });
  });

  it('prunes dropped items from allMessageItemsByID', () => {
    store.dispatch(
      actions.upsertMessage(
        makeTextResponse('m1', ['alpha', 'beta'], ['a', 'b'])
      )
    );
    expect(
      localItemsForMessage(store.getState() as AppState, 'm1')
    ).toHaveLength(2);

    // Re-upsert with only one item; the second should be pruned.
    store.dispatch(
      actions.upsertMessage(makeTextResponse('m1', ['alpha'], ['a']))
    );
    const stateAfter = store.getState() as AppState;
    expect(localItemsForMessage(stateAfter, 'm1')).toHaveLength(1);
    // Make sure the dropped item is not in allMessageItemsByID at all.
    const allItems = Object.values(stateAfter.allMessageItemsByID);
    const dropped = allItems.filter(
      (item) =>
        item.fullMessageID === 'm1' && (item.item as any).text === 'beta'
    );
    expect(dropped).toHaveLength(0);
  });

  it('rebuilds nested local items inside a CARD container', () => {
    const card: CardItem = {
      response_type: MessageResponseTypes.CARD,
      body: [
        { response_type: MessageResponseTypes.TEXT, text: 'card-text-1' },
        { response_type: MessageResponseTypes.TEXT, text: 'card-text-2' },
      ],
    };
    const message: MessageResponse = {
      id: 'm1',
      output: { generic: [card] },
    };

    store.dispatch(actions.upsertMessage(message));
    const state = store.getState() as AppState;

    const tops = localItemsForMessage(state, 'm1');
    expect(tops).toHaveLength(1);
    const nestedIDs = tops[0].ui_state.bodyLocalMessageItemIDs ?? [];
    expect(nestedIDs).toHaveLength(2);
    expect((state.allMessageItemsByID[nestedIDs[0]].item as any).text).toBe(
      'card-text-1'
    );
    expect((state.allMessageItemsByID[nestedIDs[1]].item as any).text).toBe(
      'card-text-2'
    );
  });

  it('activates the upserted message as the active response', () => {
    store.dispatch(actions.upsertMessage(makeTextResponse('m1', ['one'])));
    store.dispatch(actions.upsertMessage(makeTextResponse('m2', ['two'])));

    const state = store.getState() as AppState;
    expect(state.assistantMessageState.activeResponseId).toBe('m2');
  });

  it('preserves references for items belonging to other messages when one is upserted', () => {
    store.dispatch(
      actions.upsertMessage(
        makeTextResponse('m1', ['m1-a', 'm1-b'], ['1a', '1b'])
      )
    );
    store.dispatch(
      actions.upsertMessage(
        makeTextResponse('m2', ['m2-a', 'm2-b'], ['2a', '2b'])
      )
    );
    store.dispatch(
      actions.upsertMessage(
        makeTextResponse('m3', ['m3-a', 'm3-b'], ['3a', '3b'])
      )
    );

    const before = store.getState() as AppState;
    const m1RefsBefore = localItemsForMessage(before, 'm1');
    const m3RefsBefore = localItemsForMessage(before, 'm3');
    const m1MessageRefBefore = before.allMessagesByID['m1'];
    const m3MessageRefBefore = before.allMessagesByID['m3'];

    // Mutate only m2.
    store.dispatch(
      actions.upsertMessage(
        makeTextResponse('m2', ['m2-a', 'm2-B!'], ['2a', '2b'])
      )
    );

    const after = store.getState() as AppState;
    const m1RefsAfter = localItemsForMessage(after, 'm1');
    const m3RefsAfter = localItemsForMessage(after, 'm3');

    // Sibling-message LocalMessageItems must keep their references.
    expect(Object.is(m1RefsAfter[0], m1RefsBefore[0])).toBe(true);
    expect(Object.is(m1RefsAfter[1], m1RefsBefore[1])).toBe(true);
    expect(Object.is(m3RefsAfter[0], m3RefsBefore[0])).toBe(true);
    expect(Object.is(m3RefsAfter[1], m3RefsBefore[1])).toBe(true);

    // The whole-message references for unrelated messages must also be stable.
    expect(after.allMessagesByID['m1']).toBe(m1MessageRefBefore);
    expect(after.allMessagesByID['m3']).toBe(m3MessageRefBefore);
  });

  describe('streaming flags', () => {
    it('marks items as streaming while the message is streaming', () => {
      store.dispatch(
        actions.upsertMessage(makeTextResponse('s1', ['partial']), true)
      );

      const [local] = localItemsForMessage(store.getState() as AppState, 's1');
      expect(local.ui_state.streamingState?.isDone).toBe(false);
    });

    it('settles the flags when the message stops streaming', () => {
      store.dispatch(
        actions.upsertMessage(makeTextResponse('s2', ['partial']), true)
      );
      store.dispatch(
        actions.upsertMessage(makeTextResponse('s2', ['all of it']), false)
      );

      const [local] = localItemsForMessage(store.getState() as AppState, 's2');
      expect(local.ui_state.streamingState?.isDone).toBe(true);
    });

    it('settles the flags even when the payload did not change', () => {
      // The reference-stability path would otherwise reuse the streaming item
      // verbatim and leave it rendering as mid-stream forever.
      store.dispatch(
        actions.upsertMessage(makeTextResponse('s3', ['same'], ['1']), true)
      );
      store.dispatch(
        actions.upsertMessage(makeTextResponse('s3', ['same'], ['1']), false)
      );

      const [local] = localItemsForMessage(store.getState() as AppState, 's3');
      expect(local.ui_state.streamingState?.isDone).toBe(true);
    });

    it('keeps a settled sibling by reference while another item streams', () => {
      store.dispatch(
        actions.upsertMessage(
          makeTextResponse('sib', ['done', 'partial'], ['a', 'b']),
          true
        )
      );
      const [firstBefore] = localItemsForMessage(
        store.getState() as AppState,
        'sib'
      );

      // Only the second item changes, and the streaming state is unchanged.
      store.dispatch(
        actions.upsertMessage(
          makeTextResponse('sib', ['done', 'partial, more'], ['a', 'b']),
          true
        )
      );

      const [firstAfter] = localItemsForMessage(
        store.getState() as AppState,
        'sib'
      );
      expect(firstAfter).toBe(firstBefore);
    });

    it('never sets isIntermediateStreaming, so cards and their contents render mid-stream', () => {
      // isIntermediateStreaming hides every response type outside
      // canRenderIntermediateStreaming. Upserted cards have always rendered while
      // streaming; setting the flag here would hide them until COMPLETE.
      const card: MessageResponse = {
        id: 's5',
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.CARD,
              body: [
                { response_type: MessageResponseTypes.TEXT, text: 'in a card' },
              ],
            } as CardItem,
          ],
        },
      };

      store.dispatch(actions.upsertMessage(card, true));

      const state = store.getState() as AppState;
      const items = Object.values(state.allMessageItemsByID).filter(
        (item) => item.fullMessageID === 's5'
      );
      expect(items.length).toBeGreaterThan(1);
      for (const item of items) {
        expect(item.ui_state.isIntermediateStreaming).toBeUndefined();
      }
    });
  });

  describe('[END_MESSAGE_STREAMING] reducer', () => {
    it('settles a streaming message left mid-stream', () => {
      store.dispatch(
        actions.upsertMessage(makeTextResponse('e1', ['partial']), true)
      );

      store.dispatch(actions.endMessageStreaming('e1'));

      const [local] = localItemsForMessage(store.getState() as AppState, 'e1');
      expect(local.ui_state.streamingState?.isDone).toBe(true);
    });

    it('keeps the text a chunk stream had shown when it is cut off', () => {
      // Chunk-delivered items hold only their first delta in `item`; the rest sits in
      // `streamingState.chunks`, which renderers stop reading once the item settles.
      const streamInto: MessageResponse = {
        id: 'c1',
        output: { generic: [] },
        history: { timestamp: 1 },
      };
      const addChunk = (text: string) =>
        store.dispatch(
          actions.upsertMessage(streamInto, true, undefined, {
            origin: 'chunk',
            chunk: {
              item: {
                response_type: MessageResponseTypes.TEXT,
                text,
                streaming_metadata: { id: '1' },
              },
              isComplete: false,
            },
          })
        );
      addChunk('Hello, ');
      addChunk('world');

      store.dispatch(actions.endMessageStreaming('c1'));

      const [local] = localItemsForMessage(store.getState() as AppState, 'c1');
      expect(local.ui_state.streamingState?.isDone).toBe(true);
      expect((local.item as any).text).toBe('Hello, world');
      // Settling never reveals a type the chunk flow hides mid-stream.
      expect(local.ui_state.isIntermediateStreaming).toBe(true);
    });

    it('leaves other messages alone', () => {
      store.dispatch(
        actions.upsertMessage(makeTextResponse('e2', ['a']), true)
      );
      store.dispatch(
        actions.upsertMessage(makeTextResponse('e3', ['b']), true)
      );

      store.dispatch(actions.endMessageStreaming('e2'));

      const [other] = localItemsForMessage(store.getState() as AppState, 'e3');
      expect(other.ui_state.streamingState?.isDone).toBe(false);
    });

    it('returns the same state object when nothing was streaming', () => {
      store.dispatch(actions.upsertMessage(makeTextResponse('e4', ['done'])));
      const before = store.getState();

      store.dispatch(actions.endMessageStreaming('e4'));

      expect(store.getState()).toBe(before);
    });
  });

  describe('announcement', () => {
    const flags = (id: string) => {
      const [item] = localItemsForMessage(store.getState() as AppState, id);
      return {
        needsAnnouncement: item.ui_state.needsAnnouncement,
        wasAnnounced: item.ui_state.wasAnnounced,
        localID: item.ui_state.id,
      };
    };

    it('holds the announcement while streaming and asks for it once the item settles', () => {
      store.dispatch(
        actions.upsertMessage(makeTextResponse('a1', ['He']), true)
      );
      expect(flags('a1').needsAnnouncement).toBe(false);

      store.dispatch(actions.upsertMessage(makeTextResponse('a1', ['Hello'])));
      expect(flags('a1').needsAnnouncement).toBe(true);
    });

    it('does not ask again for an item already announced, even when it changes', () => {
      store.dispatch(actions.upsertMessage(makeTextResponse('a2', ['Hello'])));
      store.dispatch(actions.setMessageWasAnnounced(flags('a2').localID));
      expect(flags('a2')).toMatchObject({
        needsAnnouncement: false,
        wasAnnounced: true,
      });

      store.dispatch(
        actions.upsertMessage(makeTextResponse('a2', ['Hello, edited']))
      );
      expect(flags('a2')).toMatchObject({
        needsAnnouncement: false,
        wasAnnounced: true,
      });
    });
  });

  describe('pause', () => {
    const withPause = (id: string, texts: string[]): MessageResponse => {
      const message = makeTextResponse(id, texts);
      message.output.generic.splice(1, 0, {
        response_type: MessageResponseTypes.PAUSE,
        time: 500,
      } as any);
      return message;
    };
    const texts = (id: string) =>
      localItemsForMessage(store.getState() as AppState, id).map(
        (item) => (item.item as any).text
      );

    it('never gives a pause item a local item', () => {
      store.dispatch(actions.upsertMessage(withPause('p1', ['a', 'b'])));
      expect(texts('p1')).toEqual(['a', 'b']);
    });

    it('holds back new items from the given index but keeps the ones already shown', () => {
      store.dispatch(
        actions.upsertMessage(withPause('p2', ['a', 'b']), false, 1)
      );
      expect(texts('p2')).toEqual(['a']);

      store.dispatch(actions.upsertMessage(withPause('p2', ['a', 'b'])));
      expect(texts('p2')).toEqual(['a', 'b']);

      store.dispatch(
        actions.upsertMessage(withPause('p2', ['a', 'b', 'c']), false, 1)
      );
      expect(texts('p2')).toEqual(['a', 'b']);
    });

    it('keeps the prior item visible when a new item precedes it after a pause', () => {
      const initial = makeTextResponse('p3', ['A'], ['a']);
      store.dispatch(actions.upsertMessage(initial, true));
      const [prior] = localItemsForMessage(store.getState() as AppState, 'p3');
      const next = makeTextResponse('p3', ['B', 'A'], ['b', 'a']);
      next.output.generic.unshift({
        response_type: MessageResponseTypes.PAUSE,
        time: 500,
      });

      store.dispatch(actions.upsertMessage(next, true, 0));

      expect(texts('p3')).toEqual(['A']);
      expect(localItemsForMessage(store.getState() as AppState, 'p3')[0]).toBe(
        prior
      );

      store.dispatch(actions.upsertMessage(next, true));

      expect(texts('p3')).toEqual(['B', 'A']);
    });

    it('holds a replacement with a different streaming id until the pause ends', () => {
      store.dispatch(
        actions.upsertMessage(makeTextResponse('p4', ['A'], ['a']), true)
      );
      const next = makeTextResponse('p4', ['B'], ['b']);
      next.output.generic.unshift({
        response_type: MessageResponseTypes.PAUSE,
        time: 500,
      });

      store.dispatch(actions.upsertMessage(next, true, 0));
      expect(texts('p4')).toEqual([]);

      store.dispatch(actions.upsertMessage(next, true));
      expect(texts('p4')).toEqual(['B']);
    });

    it('retains positional matches when a new identified item is held back', () => {
      store.dispatch(
        actions.upsertMessage(
          makeTextResponse('p5', ['A', 'Positional'], ['a']),
          true
        )
      );
      const [priorA, priorPositional] = localItemsForMessage(
        store.getState() as AppState,
        'p5'
      );
      const next = makeTextResponse(
        'p5',
        ['B', 'Positional', 'A'],
        ['b', undefined, 'a']
      );
      next.output.generic.unshift({
        response_type: MessageResponseTypes.PAUSE,
        time: 500,
      });

      store.dispatch(actions.upsertMessage(next, true, 0));

      const visible = localItemsForMessage(store.getState() as AppState, 'p5');
      expect(texts('p5')).toEqual(['Positional', 'A']);
      expect(visible[0]).toBe(priorPositional);
      expect(visible[1]).toBe(priorA);

      store.dispatch(
        actions.upsertMessage(next, true, undefined, {
          pauseReveal: {
            originalLocalIDs: [priorA.ui_state.id, priorPositional.ui_state.id],
            previousHoldFromIndex: 0,
          },
        })
      );

      const revealed = localItemsForMessage(store.getState() as AppState, 'p5');
      expect(texts('p5')).toEqual(['B', 'Positional', 'A']);
      expect(revealed[1]).toBe(priorPositional);
      expect(revealed[2]).toBe(priorA);
    });

    it('keeps equal positional siblings distinct through two pause reveals', () => {
      store.dispatch(
        actions.upsertMessage(
          makeTextResponse('p6', ['A', 'Same'], ['a']),
          true
        )
      );
      const [priorA, priorPositional] = localItemsForMessage(
        store.getState() as AppState,
        'p6'
      );
      const originalLocalIDs = [
        priorA.ui_state.id,
        priorPositional.ui_state.id,
      ];
      const next = makeTextResponse(
        'p6',
        ['Same', 'Same', 'New', 'A'],
        [undefined, undefined, undefined, 'a']
      );
      const pause: PauseItem = {
        response_type: MessageResponseTypes.PAUSE,
        time: 500,
      };
      next.output.generic.unshift(pause);
      next.output.generic.splice(3, 0, pause);

      store.dispatch(actions.upsertMessage(next, true, 0));
      expect(texts('p6')).toEqual(['Same', 'A']);
      expect(localItemsForMessage(store.getState() as AppState, 'p6')[0]).toBe(
        priorPositional
      );

      store.dispatch(
        actions.upsertMessage(next, true, 3, {
          pauseReveal: { originalLocalIDs, previousHoldFromIndex: 0 },
        })
      );
      const between = localItemsForMessage(store.getState() as AppState, 'p6');
      expect(texts('p6')).toEqual(['Same', 'Same', 'A']);
      expect(between[0]).not.toBe(priorPositional);
      expect(between[1]).toBe(priorPositional);

      store.dispatch(
        actions.upsertMessage(next, true, undefined, {
          pauseReveal: { originalLocalIDs, previousHoldFromIndex: 3 },
        })
      );
      const revealed = localItemsForMessage(store.getState() as AppState, 'p6');
      expect(texts('p6')).toEqual(['Same', 'Same', 'New', 'A']);
      expect(revealed[0]).toBe(between[0]);
      expect(revealed[1]).toBe(priorPositional);
      expect(revealed[3]).toBe(priorA);
    });
  });

  describe('chunk-origin streaming writes', () => {
    const placeholder = (id: string): MessageResponse => ({
      id,
      output: { generic: [] },
      history: { timestamp: 1 },
    });
    const text = (itemID: string | undefined, value: string) => ({
      response_type: MessageResponseTypes.TEXT,
      text: value,
      ...(itemID ? { streaming_metadata: { id: itemID } } : {}),
    });
    const writeChunk = (
      message: MessageResponse,
      item: Record<string, unknown>,
      isComplete = false,
      isStopped = false
    ) =>
      store.dispatch(
        actions.upsertMessage(message, true, undefined, {
          origin: 'chunk',
          chunk: { item, isComplete, isStopped },
        })
      );
    const state = () => store.getState() as AppState;

    const renderedText = (id: string) => {
      const local = localItemsForMessage(
        state(),
        id
      )[0] as LocalMessageItem<TextItem>;
      return deriveStreamingItemText(
        local.item.text,
        local.ui_state.streamingState
      );
    };

    it('preserves snapshot text when chunks continue the same item and the stream stops', () => {
      const message = makeTextResponse('mixed-text', ['Hel'], ['a']);
      store.dispatch(actions.upsertMessage(message, true));

      writeChunk(message, text('a', 'lo'));
      expect(renderedText(message.id)).toBe('Hello');
      writeChunk(message, text('a', ' there'));
      expect(renderedText(message.id)).toBe('Hello there');

      store.dispatch(actions.endMessageStreaming(message.id));
      expect(renderedText(message.id)).toBe('Hello there');
    });

    describe.each([
      MessageResponseTypes.TEXT,
      MessageResponseTypes.CONVERSATIONAL_SEARCH,
    ])('stopped %s chunks', (responseType) => {
      it.each(['new', 'streaming', 'settled'] as const)(
        'preserves repeated deltas for a %s item without changing siblings',
        (initialState) => {
          const message = placeholder('stopped');
          const delta = (value: string) => ({
            ...text('a', value),
            response_type: responseType,
          });
          if (initialState !== 'new') {
            writeChunk(message, delta('Earlier '));
            writeChunk(message, delta('text. '));
            if (initialState === 'settled') {
              store.dispatch(actions.endMessageStreaming(message.id));
            }
          }
          writeChunk(message, text('sibling', 'Unchanged'));
          const sibling = state().allMessageItemsByID['stopped-sibling'];
          const prefix = initialState === 'new' ? '' : 'Earlier text. ';

          for (const [value, expected] of [
            ['Hello ', `${prefix}Hello `],
            ['world', `${prefix}Hello world`],
          ]) {
            const before = state().allMessageItemsByID['stopped-a'];
            const previousText = (before?.item as TextItem)?.text;
            writeChunk(message, delta(value), false, true);

            const local = state().allMessageItemsByID[
              'stopped-a'
            ] as LocalMessageItem<TextItem>;
            expect(local.item.text).toBe(expected);
            expect(
              deriveStreamingItemText(
                local.item.text,
                local.ui_state.streamingState
              )
            ).toBe(expected);
            expect(local.ui_state.streamingState).toEqual({
              chunks: [],
              isDone: true,
            });
            expect(local.ui_state.isIntermediateStreaming).toBe(true);
            expect(local.ui_state.needsAnnouncement).toBe(false);
            expect(state().allMessageItemsByID['stopped-sibling']).toBe(
              sibling
            );
            expect((before?.item as TextItem)?.text).toBe(previousText);
          }

          writeChunk(message, delta('Final replacement'), true, true);
          const completed = state().allMessageItemsByID[
            'stopped-a'
          ] as LocalMessageItem<TextItem>;
          expect(completed.item.text).toBe('Final replacement');
          expect(completed.ui_state.isIntermediateStreaming).toBe(false);
          expect(completed.ui_state.streamingState).toEqual({
            chunks: [],
            isDone: true,
          });
        }
      );
    });

    it('continues the latest snapshot after switching from chunks and back', () => {
      const message = makeTextResponse('mixed-snapshot', ['Old'], ['a']);
      store.dispatch(actions.upsertMessage(message, true));
      writeChunk(message, text('a', ' text'));
      const updated = makeTextResponse(message.id, ['New'], ['a']);
      store.dispatch(actions.upsertMessage(updated, true));

      writeChunk(updated, text('a', ' text'));

      expect(renderedText(message.id)).toBe('New text');
    });

    it('builds a new partial item from the chunk itself, hidden and unannounced', () => {
      const message = placeholder('c1');
      const delta = text('a', 'Hel');

      writeChunk(message, delta);

      const local = state().allMessageItemsByID['c1-a'];
      expect(local.item).toBe(delta);
      expect(local.fullMessageID).toBe('c1');
      expect(local.ui_state.needsAnnouncement).toBe(false);
      expect(local.ui_state.isIntermediateStreaming).toBe(true);
      expect(local.ui_state.streamingState).toEqual({
        chunks: [delta],
        isDone: false,
      });
      expect(local.ui_state.streamingState.chunks[0]).toBe(delta);
      expect(state().allMessagesByID['c1']).toBe(message);
      expect(state().assistantMessageState.messageIDs).toEqual(['c1']);
    });

    it('only stores the message for a chunk that carries no item', () => {
      const message: MessageResponse = {
        ...placeholder('c-options'),
        message_options: { response_user_profile: { id: 'bot' } } as any,
      };

      store.dispatch(
        actions.upsertMessage(message, true, undefined, {
          origin: 'chunk',
          chunk: { item: undefined, isComplete: false },
        })
      );

      expect(state().allMessagesByID['c-options']).toBe(message);
      expect(
        Object.values(state().allMessageItemsByID).filter(
          (item) => item.fullMessageID === 'c-options'
        )
      ).toHaveLength(0);
    });

    it('keeps a new complete_item hidden but settled', () => {
      writeChunk(placeholder('c2'), text('a', 'Done'), true);

      const local = state().allMessageItemsByID['c2-a'];
      expect(local.ui_state.isIntermediateStreaming).toBe(true);
      expect(local.ui_state.streamingState).toEqual({
        chunks: [],
        isDone: true,
      });
    });

    it('adds later partials to chunks and leaves the item and the list alone', () => {
      const message = placeholder('c3');
      const first = text('a', 'Hello ');
      writeChunk(message, first);
      const idsBefore = state().assistantMessageState.localMessageIDs;

      const second = text('a', 'world');
      writeChunk(message, second);

      const local = state().allMessageItemsByID['c3-a'];
      expect(local.item).toBe(first);
      expect(local.ui_state.streamingState).toEqual({
        chunks: [first, second],
        isDone: false,
      });
      expect(state().assistantMessageState.localMessageIDs).toBe(idsBefore);
    });

    it('merges a complete_item over the first chunk and shows the item', () => {
      const message = placeholder('c4');
      writeChunk(message, { ...text('a', 'Part'), first_only: 'kept' });
      writeChunk(message, { ...text('a', 'ial'), second_only: 'lost' });

      writeChunk(message, text('a', 'Complete'), true);

      const local = state().allMessageItemsByID['c4-a'];
      expect(local.item).toEqual({
        ...text('a', 'Complete'),
        first_only: 'kept',
      });
      expect(local.ui_state.isIntermediateStreaming).toBe(false);
      expect(local.ui_state.streamingState).toEqual({
        chunks: [],
        isDone: true,
      });
    });

    it('carries isDone over on a partial that follows a complete_item', () => {
      const message = placeholder('c5');
      writeChunk(message, text('a', 'Done'), true);
      const late = text('a', ' late');

      writeChunk(message, late);

      expect(
        state().allMessageItemsByID['c5-a'].ui_state.streamingState
      ).toEqual({ chunks: [late], isDone: true });
    });

    it('appends new items at the end of the whole list, not with their message', () => {
      writeChunk(placeholder('A'), text('a1', 'A1'));
      writeChunk(placeholder('B'), text('b1', 'B1'));
      writeChunk(placeholder('A'), text('a2', 'A2'));

      expect(state().assistantMessageState.localMessageIDs).toEqual([
        'A-a1',
        'B-b1',
        'A-a2',
      ]);
    });

    it('keys an item without a streaming id once per message', () => {
      writeChunk(placeholder('n1'), text(undefined, 'One'));
      writeChunk(placeholder('n2'), text(undefined, 'Two'));

      expect(state().assistantMessageState.localMessageIDs).toEqual([
        'n1-__no_stream_id__',
        'n2-__no_stream_id__',
      ]);
    });

    it('builds no nested items for a container', () => {
      const card = {
        response_type: MessageResponseTypes.CARD,
        streaming_metadata: { id: 'card' },
        body: [{ response_type: MessageResponseTypes.TEXT, text: 'in a card' }],
      };

      writeChunk(placeholder('c6'), card, true);

      const items = Object.values(state().allMessageItemsByID).filter(
        (item) => item.fullMessageID === 'c6'
      );
      expect(items).toHaveLength(1);
      expect(items[0].ui_state.bodyLocalMessageItemIDs).toBeUndefined();
    });

    it('leaves the message’s other items and the stored message as they were', () => {
      const upserted = makeTextResponse('c7', ['From upsert'], ['a']);
      store.dispatch(actions.upsertMessage(upserted, true));
      const [upsertedLocal] = localItemsForMessage(state(), 'c7');
      const messagesBefore = state().allMessagesByID;

      writeChunk(upserted, text('b', 'From chunk'));

      expect(localItemsForMessage(state(), 'c7')[0]).toBe(upsertedLocal);
      expect(state().allMessagesByID).toBe(messagesBefore);
      expect(state().assistantMessageState.localMessageIDs).toEqual([
        'c7-a',
        'c7-b',
      ]);
    });

    it('keeps an open home screen open', () => {
      store = createAppStore(rootReducer, {
        ...createInitialAppState(),
        persistedToBrowserStorage: {
          ...DEFAULT_PERSISTED_TO_BROWSER,
          homeScreenState: {
            isHomeScreenOpen: true,
            showBackToAssistant: false,
          },
        },
      });

      writeChunk(placeholder('c8'), text('a', 'Hi'));

      expect(
        state().persistedToBrowserStorage.homeScreenState.isHomeScreenOpen
      ).toBe(true);
    });

    it('throws and writes nothing when a new item has no response_type', () => {
      const before = state();

      expect(() =>
        writeChunk(placeholder('c9'), { streaming_metadata: { id: 'a' } })
      ).toThrow('New chunk item does not have a response_type');
      expect(state()).toBe(before);
    });

    describe('which types stay hidden mid-stream', () => {
      // A copy of canRenderIntermediateStreaming in MessageComponent.tsx, which isn't
      // exported: the types the chat draws while isIntermediateStreaming is set.
      const drawnMidStream = new Set<string>([
        MessageResponseTypes.IMAGE,
        MessageResponseTypes.VIDEO,
        MessageResponseTypes.AUDIO,
        MessageResponseTypes.OPTION,
        MessageResponseTypes.IFRAME,
        MessageResponseTypes.INLINE_ERROR,
        MessageResponseTypes.CONVERSATIONAL_SEARCH,
        MessageResponseTypes.USER_DEFINED,
        MessageResponseTypes.TEXT,
      ]);
      // Whether each chunk sequence leaves an item hidden, as
      // [new partial, new complete, partial then complete, complete then complete].
      const sequences = [[false], [true], [false, true], [true, true]];
      const hidden: Record<string, boolean[]> = {
        [MessageResponseTypes.TEXT]: [false, false, false, false],
        [MessageResponseTypes.OPTION]: [false, false, false, false],
        [MessageResponseTypes.CONNECT_TO_HUMAN_AGENT]: [
          true,
          true,
          false,
          false,
        ],
        [MessageResponseTypes.IMAGE]: [false, false, false, false],
        [MessageResponseTypes.PAUSE]: [true, true, false, false],
        [MessageResponseTypes.USER_DEFINED]: [false, false, false, false],
        [MessageResponseTypes.IFRAME]: [false, false, false, false],
        [MessageResponseTypes.VIDEO]: [false, false, false, false],
        [MessageResponseTypes.AUDIO]: [false, false, false, false],
        [MessageResponseTypes.DATE]: [true, true, false, false],
        [MessageResponseTypes.INLINE_ERROR]: [false, false, false, false],
        [MessageResponseTypes.CARD]: [true, true, false, false],
        [MessageResponseTypes.CAROUSEL]: [true, true, false, false],
        [MessageResponseTypes.BUTTON]: [true, true, false, false],
        [MessageResponseTypes.GRID]: [true, true, false, false],
        [MessageResponseTypes.CONVERSATIONAL_SEARCH]: [
          false,
          false,
          false,
          false,
        ],
        [MessageResponseTypes.PREVIEW_CARD]: [true, true, false, false],
        [MessageResponseTypes.SYSTEM]: [true, true, false, false],
      };

      it('holds the same types mid-stream as before', () => {
        expect(Object.keys(hidden).sort()).toEqual(
          Object.values(MessageResponseTypes).sort()
        );

        const actual = Object.fromEntries(
          Object.keys(hidden).map((type) => [
            type,
            sequences.map((sequence, index) => {
              const message = placeholder(`held-${type}-${index}`);
              sequence.forEach((isComplete) =>
                writeChunk(
                  message,
                  { response_type: type, streaming_metadata: { id: 'x' } },
                  isComplete
                )
              );
              const { ui_state } =
                state().allMessageItemsByID[`${message.id}-x`];
              return (
                ui_state.isIntermediateStreaming && !drawnMidStream.has(type)
              );
            }),
          ])
        );

        expect(actual).toEqual(hidden);
      });
    });
  });
});

describe('upsert streaming snapshots', () => {
  it.each([
    { response_type: MessageResponseTypes.TEXT, text: 'snapshot' },
    {
      response_type: MessageResponseTypes.CONVERSATIONAL_SEARCH,
      text: 'snapshot',
    },
    {
      response_type: MessageResponseTypes.USER_DEFINED,
      user_defined: { value: 'snapshot' },
    },
  ])(
    'settles unchanged $response_type snapshots and preserves stable siblings',
    (item) => {
      const message = {
        id: 'stream',
        output: {
          generic: [
            item,
            { response_type: MessageResponseTypes.IMAGE, source: 'image.png' },
          ],
        },
      } as MessageResponse;
      const initial = rootReducer(
        createInitialAppState(),
        actions.upsertMessage(message, true)
      );
      const [id, siblingID] = initial.assistantMessageState.localMessageIDs;
      expect(initial.allMessageItemsByID[id].ui_state).toMatchObject({
        needsAnnouncement: false,
        streamingState: { chunks: [], isDone: false },
      });
      expect(
        initial.allMessageItemsByID[id].ui_state.isIntermediateStreaming
      ).toBe(true);
      expect(initial.allMessageItemsByID[id].item).toBe(item);
      const repeated = rootReducer(
        initial,
        actions.upsertMessage(message, true)
      );
      expect(repeated.allMessageItemsByID[id]).toBe(
        initial.allMessageItemsByID[id]
      );
      expect(repeated.allMessageItemsByID[siblingID]).toBe(
        initial.allMessageItemsByID[siblingID]
      );
      const settled = rootReducer(
        repeated,
        actions.upsertMessage(message, false)
      );
      expect(settled.allMessageItemsByID[id].ui_state).toMatchObject({
        id,
        needsAnnouncement: true,
        streamingState: { chunks: [], isDone: true },
      });
      expect(
        settled.allMessageItemsByID[id].ui_state.isIntermediateStreaming
      ).toBe(false);
      expect(
        settled.allMessageItemsByID[siblingID].ui_state.streamingState
      ).toBeUndefined();
      expect(
        initial.allMessageItemsByID[siblingID].ui_state.streamingState
      ).toBeUndefined();
      expect(
        initial.allMessageItemsByID[id].ui_state.streamingState.isDone
      ).toBe(false);
      const final = rootReducer(settled, actions.upsertMessage(message));
      expect(final.allMessageItemsByID[id]).toBe(
        settled.allMessageItemsByID[id]
      );
      expect(final.allMessageItemsByID[siblingID]).toBe(
        settled.allMessageItemsByID[siblingID]
      );
    }
  );
});
