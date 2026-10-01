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
  ButtonItemType,
  CardItem,
  MessageResponse,
  MessageResponseTypes,
} from '../../../src/types/messaging/Messages';
import { HumanAgentsOnlineStatus } from '../../../src/types/config/ServiceDeskConfig';

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

  describe('nested items of a changed container', () => {
    const text = (value: string) => ({
      response_type: MessageResponseTypes.TEXT,
      text: value,
    });
    const button = (label: string) => ({
      response_type: MessageResponseTypes.BUTTON,
      button_type: ButtonItemType.POST_BACK,
      label,
      value: { input: { text: label } },
    });
    const upsertOne = (item: Record<string, unknown>) => {
      store.dispatch(
        actions.upsertMessage({
          id: 'h12',
          output: { generic: [item as any] },
        })
      );
      return localItemsForMessage(store.getState() as AppState, 'h12')[0];
    };
    const nestedOf = (ids: string[]) =>
      ids.map((id) => (store.getState() as AppState).allMessageItemsByID[id]);

    it('keeps each nested item’s id by its place, and an unchanged one’s reference', () => {
      const card = (bodyText: string) => ({
        response_type: MessageResponseTypes.CARD,
        body: [text('Title'), text(bodyText)],
        footer: [button('Go')],
      });
      const before = upsertOne(card('Draft'));
      const bodyBefore = nestedOf(before.ui_state.bodyLocalMessageItemIDs);
      const footerBefore = nestedOf(before.ui_state.footerLocalMessageItemIDs);

      const after = upsertOne(card('Final'));
      const bodyAfter = nestedOf(after.ui_state.bodyLocalMessageItemIDs);

      expect(after).not.toBe(before);
      expect(after.ui_state.bodyLocalMessageItemIDs).toEqual(
        before.ui_state.bodyLocalMessageItemIDs
      );
      expect(bodyAfter[0]).toBe(bodyBefore[0]);
      expect(bodyAfter[1]).not.toBe(bodyBefore[1]);
      expect((bodyAfter[1].item as any).text).toBe('Final');
      expect(nestedOf(after.ui_state.footerLocalMessageItemIDs)[0]).toBe(
        footerBefore[0]
      );
    });

    it.each([
      [
        'grid cell',
        (cellText: string) => ({
          response_type: MessageResponseTypes.GRID,
          rows: [{ cells: [{ items: [text('Fixed'), text(cellText)] }] }],
        }),
        (item: any) => item.ui_state.gridLocalMessageItemIDs[0][0],
      ],
      [
        'button panel',
        (bodyText: string) => ({
          response_type: MessageResponseTypes.BUTTON,
          button_type: ButtonItemType.SHOW_PANEL,
          label: 'Open',
          panel: { body: [text('Fixed'), text(bodyText)] },
        }),
        (item: any) => item.ui_state.bodyLocalMessageItemIDs,
      ],
    ])(
      'keeps the ids of the items in a %s',
      (_slot, container, idsOf: (item: any) => string[]) => {
        const idsBefore = idsOf(upsertOne(container('Draft')));
        const [fixedBefore] = nestedOf(idsBefore);

        const idsAfter = idsOf(upsertOne(container('Final')));

        expect(idsAfter).toEqual(idsBefore);
        expect(nestedOf(idsAfter)[0]).toBe(fixedBefore);
        expect((nestedOf(idsAfter)[1].item as any).text).toBe('Final');
      }
    );

    it('prunes the nested items a container no longer has', () => {
      const card = (texts: string[]) => ({
        response_type: MessageResponseTypes.CARD,
        body: texts.map(text),
      });
      const before = upsertOne(card(['One', 'Two']));
      const [, droppedID] = before.ui_state.bodyLocalMessageItemIDs;

      const after = upsertOne(card(['One, edited']));

      expect(after.ui_state.bodyLocalMessageItemIDs).toEqual([
        before.ui_state.bodyLocalMessageItemIDs[0],
      ]);
      expect(
        (store.getState() as AppState).allMessageItemsByID[droppedID]
      ).toBeUndefined();
    });
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

    it('applies the flags to nested items too', () => {
      const card: MessageResponse = {
        id: 's4',
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
      const nested = Object.values(state.allMessageItemsByID).filter(
        (item) => item.fullMessageID === 's4'
      );
      expect(nested.length).toBeGreaterThan(1);
      for (const item of nested) {
        expect(item.ui_state.streamingState?.isDone).toBe(false);
      }
    });

    it.each([
      [
        'carousel',
        {
          response_type: MessageResponseTypes.CAROUSEL,
          items: [
            {
              response_type: MessageResponseTypes.CARD,
              body: [
                { response_type: MessageResponseTypes.TEXT, text: 'slide' },
              ],
            },
          ],
        },
      ],
      [
        'grid',
        {
          response_type: MessageResponseTypes.GRID,
          columns: [{ width: '1' }],
          rows: [
            {
              cells: [
                {
                  items: [
                    { response_type: MessageResponseTypes.TEXT, text: 'cell' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    ])(
      'applies the streaming state to items nested in a %s, both ways',
      (_name, container) => {
        const message = (): MessageResponse => ({
          id: 'nest',
          output: { generic: [container as any] },
        });
        const nestedDone = () =>
          Object.values((store.getState() as AppState).allMessageItemsByID)
            .filter((item) => item.fullMessageID === 'nest')
            .map((item) => item.ui_state.streamingState?.isDone);

        store.dispatch(actions.upsertMessage(message(), true));
        const streaming = nestedDone();
        expect(streaming.length).toBeGreaterThan(1);
        expect(streaming.every((isDone) => isDone === false)).toBe(true);

        store.dispatch(actions.upsertMessage(message(), false));
        expect(nestedDone().every((isDone) => isDone === true)).toBe(true);
      }
    );

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

    it('settles nested items of an upserted container', () => {
      const card: MessageResponse = {
        id: 'e5',
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

      store.dispatch(actions.endMessageStreaming('e5'));

      const items = Object.values(
        (store.getState() as AppState).allMessageItemsByID
      ).filter((item) => item.fullMessageID === 'e5');
      expect(items.length).toBeGreaterThan(1);
      for (const item of items) {
        expect(item.ui_state.streamingState?.isDone).toBe(true);
      }
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
      isComplete = false
    ) =>
      store.dispatch(
        actions.upsertMessage(message, true, undefined, {
          origin: 'chunk',
          chunk: { item, isComplete },
        })
      );
    const state = () => store.getState() as AppState;

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
        [MessageResponseTypes.CAROUSEL]: [true, true, true, true],
        [MessageResponseTypes.BUTTON]: [true, true, false, false],
        [MessageResponseTypes.GRID]: [true, true, true, true],
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

    it('keeps a grid that upsertMessage drew shown when a chunk completes it', () => {
      const grid = {
        response_type: MessageResponseTypes.GRID,
        streaming_metadata: { id: 'g' },
        columns: [{ width: '1' }],
        rows: [
          {
            cells: [
              {
                items: [
                  { response_type: MessageResponseTypes.TEXT, text: 'cell' },
                ],
              },
            ],
          },
        ],
      };
      store.dispatch(
        actions.upsertMessage(
          { id: 'u-grid', output: { generic: [grid as any] } },
          false
        )
      );
      const before = state().allMessageItemsByID['u-grid-g'];
      expect(before.ui_state.gridLocalMessageItemIDs).toHaveLength(1);

      writeChunk(
        state().allMessagesByID['u-grid'] as MessageResponse,
        grid,
        true
      );

      const after = state().allMessageItemsByID['u-grid-g'];
      expect(after.ui_state.isIntermediateStreaming).toBeFalsy();
      expect(after.ui_state.gridLocalMessageItemIDs).toBe(
        before.ui_state.gridLocalMessageItemIDs
      );
    });

    describe.each([
      [
        'grid',
        {
          response_type: MessageResponseTypes.GRID,
          columns: [{ width: '1' }],
          rows: [
            {
              cells: [
                {
                  items: [
                    { response_type: MessageResponseTypes.TEXT, text: 'cell' },
                  ],
                },
              ],
            },
          ],
        },
      ],
      [
        'carousel',
        {
          response_type: MessageResponseTypes.CAROUSEL,
          items: [
            {
              response_type: MessageResponseTypes.CARD,
              body: [
                { response_type: MessageResponseTypes.TEXT, text: 'slide' },
              ],
            },
          ],
        },
      ],
    ])('a streamed %s', (name, container) => {
      const streamed = { ...container, streaming_metadata: { id: 'x' } };
      const first = {
        response_type: container.response_type,
        streaming_metadata: { id: 'x' },
      };

      it(`keeps a ${name} held when its complete_item lands`, () => {
        const message = placeholder(`held-${name}`);
        writeChunk(message, first);

        writeChunk(message, streamed, true);

        const local = state().allMessageItemsByID[`held-${name}-x`];
        expect(local.ui_state.isIntermediateStreaming).toBe(true);
        expect(local.ui_state.streamingState).toEqual({
          chunks: [],
          isDone: true,
        });
        expect(local.item).toEqual(streamed);
      });

      it(`keeps a ${name} whose first chunk is complete_item held through a second complete_item`, () => {
        const message = placeholder(`held-twice-${name}`);
        writeChunk(message, streamed, true);

        writeChunk(message, streamed, true);

        expect(
          state().allMessageItemsByID[`held-twice-${name}-x`].ui_state
            .isIntermediateStreaming
        ).toBe(true);
      });
    });
  });
});

describe('[UPSERT_MESSAGE] an item the chat cannot draw', () => {
  let store: ReturnType<typeof createAppStore>;

  beforeEach(() => {
    store = createAppStore(rootReducer, createInitialAppState());
  });

  const text = (value: string) => ({
    response_type: MessageResponseTypes.TEXT,
    text: value,
  });
  const grid = (cells: unknown[]) => ({
    response_type: MessageResponseTypes.GRID,
    rows: [{ cells }],
  });
  const write = (generic: unknown[], isStreaming: boolean) =>
    store.dispatch(
      actions.upsertMessage(
        { id: 'd1', output: { generic } } as MessageResponse,
        isStreaming
      )
    );
  const shown = () => localItemsForMessage(store.getState() as AppState, 'd1');

  it('marks the item with what it is missing, and builds nothing nested in it', () => {
    write(
      [
        {
          response_type: MessageResponseTypes.CARD,
          body: [null, text('Body')],
        },
      ],
      true
    );

    const [card] = shown();
    expect(card.ui_state.cannotDraw).toEqual({ missing: ['body[0]'] });
    expect(card.ui_state.bodyLocalMessageItemIDs).toBeUndefined();
    expect(
      Object.keys((store.getState() as AppState).allMessageItemsByID)
    ).toEqual([card.ui_state.id]);
  });

  it('leaves an item that can draw unmarked', () => {
    write([grid([{ items: [text('A')] }])], true);

    expect(shown()[0].ui_state.cannotDraw).toBeUndefined();
  });

  it('keeps the last drawn version while the stream is open, until a new one can draw', () => {
    write([grid([{ items: [text('A')] }])], true);
    const [drawn] = shown();
    const [[[cellItemID]]] = drawn.ui_state.gridLocalMessageItemIDs;

    write([grid([{ items: [text('A')] }, {}])], true);
    expect(shown()[0]).toBe(drawn);
    expect(
      (store.getState() as AppState).allMessageItemsByID[cellItemID]
    ).toBeDefined();

    write([grid([{ items: [text('A')] }, { items: [text('B')] }])], true);
    expect(shown()[0]).not.toBe(drawn);
    expect(shown()[0].ui_state.cannotDraw).toBeUndefined();
    expect(shown()[0].ui_state.gridLocalMessageItemIDs[0]).toHaveLength(2);
  });

  it('hides an item that never drew, in its place in the message', () => {
    write(
      [{ response_type: MessageResponseTypes.CAROUSEL }, text('After')],
      true
    );

    const [carousel, after] = shown();
    expect(carousel.ui_state.cannotDraw).toEqual({ missing: ['items'] });
    expect((after.item as any).text).toBe('After');
  });

  it('does not keep a version of another type', () => {
    write([{ response_type: MessageResponseTypes.CARD, body: [] }], true);

    write([{ response_type: MessageResponseTypes.GRID }], true);

    const [item] = shown();
    expect(item.item.response_type).toBe(MessageResponseTypes.GRID);
    expect(item.ui_state.cannotDraw).toEqual({ missing: ['rows'] });
  });

  it('does not keep the last drawn version once the stream completes', () => {
    write([grid([{ items: [text('A')] }])], true);
    const [drawn] = shown();

    write([grid([{ items: [text('A')] }, {}])], false);

    expect(shown()[0]).not.toBe(drawn);
    expect(shown()[0].ui_state.cannotDraw).toEqual({
      missing: ['rows[0].cells[1].items'],
    });
  });
});
