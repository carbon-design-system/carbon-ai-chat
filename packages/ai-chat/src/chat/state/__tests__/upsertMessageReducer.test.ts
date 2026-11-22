/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createAppStore } from '../../../sdk/store/appStore';

import { buildLanguagePack } from '../../../sdk/store/doCreateStore';

import actions from '../../../sdk/store/actions';
import { AppState } from '../../../types/state/AppState';

import {
  DEFAULT_INPUT_STATE,
  DEFAULT_CHAT_MESSAGES_STATE,
  DEFAULT_PERSISTED_TO_BROWSER,
  DEFAULT_HUMAN_AGENT_STATE,
} from '../../../sdk/store/reducerUtils';

import {
  MessageResponse,
  MessageResponseTypes,
} from '../../../types/messaging/Messages';

import { DEFAULT_HISTORY_PANEL_STATE } from '..';
import { appRootReducer } from '../../__tests__/helpers/chat';

import { createInitialViewState } from '../initialState';

import { VIEW_STATE_ALL_CLOSED, viewHalfOf } from '..';

function createInitialAppState(): AppState {
  const config: AppState['config'] = { public: {} };

  return {
    config,
    languagePack: buildLanguagePack(config.public.strings),
    loadedLocale: 'en',
    allMessageItemsByID: {},
    allMessagesByID: {},
    assistantMessageState: DEFAULT_CHAT_MESSAGES_STATE,
    isHydrated: false,
    isRestarting: false,
    conversationStatus: 'ready',
    conversationError: null,
    assistantInputState: DEFAULT_INPUT_STATE,
    humanAgentState: DEFAULT_HUMAN_AGENT_STATE,
    persistedToBrowserStorage: {
      hasSentNonWelcomeMessage:
        DEFAULT_PERSISTED_TO_BROWSER.hasSentNonWelcomeMessage,
      humanAgentState: DEFAULT_PERSISTED_TO_BROWSER.humanAgentState,
    },
    view: {
      ...createInitialViewState(config.public, null),
      targetViewState: VIEW_STATE_ALL_CLOSED,
      historyPanelState: DEFAULT_HISTORY_PANEL_STATE,
      persistedToBrowserStorage: {
        ...viewHalfOf(DEFAULT_PERSISTED_TO_BROWSER),
        homeScreenState: {
          isHomeScreenOpen: false,
          showBackToAssistant: false,
        },
      },
    },
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
    store = createAppStore(appRootReducer, createInitialAppState());
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
});
