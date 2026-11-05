/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import actions from '../../../src/shared/store/actions';
import { setIsConnecting } from '../../../src/shared/store/humanAgentActions';
import type { ServiceManager } from '../../../src/shared/services/ServiceManager';
import type { AppStore } from '../../../src/shared/store/appStore';
import type {
  AppState,
  ConversationPersistedState,
  ConversationState,
  InputState,
} from '../../../src/types/state/AppState';
import type {
  ViewPartitionState,
  ViewPersistedState,
} from '../../../src/types/state/ViewPartitionState';
import {
  HumanAgentMessageType,
  MessageResponse,
  MessageResponseTypes,
} from '../../../src/types/messaging/Messages';
import { outputItemToLocalItem } from '../../../src/shared/schema/outputItemToLocalItem';
import { viewActions } from '../../../src/view/state';
import { makeConfigStore } from '../../test_helpers';

// O1: each slice is in exactly one partition. Saved state is the one slice
// split by field (#1831 O4): each partition holds a half, with no field in both.
type Overlap = Exclude<
  keyof ConversationState & keyof ViewPartitionState,
  'persistedToBrowserStorage'
>;
type SavedOverlap = keyof ConversationPersistedState & keyof ViewPersistedState;
const noOverlap: [Overlap | SavedOverlap] extends [never] ? true : false = true;

// O3: the view partition holds no upload list; uploads are conversation state.
type ViewUploads = Extract<keyof ViewPartitionState, 'pendingUploads'>;
const noViewUploads: [ViewUploads] extends [never] ? true : false = true;
const conversationUploads: InputState['pendingUploads'] extends unknown[]
  ? true
  : false = true;

// O5/O6: the store shared code sees has no view partition.
type SharedStore = ServiceManager['store'];
type SharedState = ReturnType<SharedStore['getState']>;
const sharedSeesNoView: 'view' extends keyof SharedState ? false : true = true;

function agentMessage(id: string, type?: HumanAgentMessageType) {
  const message: MessageResponse = {
    id,
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: 'Hi',
          agent_message_type: type,
        },
      ],
    },
    history: { timestamp: 0 },
  };
  return {
    message,
    local: outputItemToLocalItem(message.output.generic[0], message),
  };
}

function view(store: AppStore<AppState>) {
  return store.getState().view;
}

describe('the view partition', () => {
  it('declares every slice in one partition only', () => {
    expect([
      noOverlap,
      noViewUploads,
      conversationUploads,
      sharedSeesNoView,
    ]).toEqual([true, true, true, true]);
  });

  it('resets its panels and error screen on a restart, and opens the home screen when it is on', () => {
    const store = makeConfigStore({ homescreen: { isOn: true } });
    store.dispatch(viewActions.setCustomPanelOpen(true));
    store.dispatch(viewActions.setViewValue('catastrophicErrorType', true));
    const listener = jest.fn();
    store.subscribe(listener);

    store.dispatch(actions.restartConversation());

    expect(view(store).customPanelState.isOpen).toBe(false);
    expect(view(store).catastrophicErrorType).toBeNull();
    expect(
      view(store).persistedToBrowserStorage.homeScreenState.isHomeScreenOpen
    ).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('closes the home screen when an item shows, in the same notification', () => {
    const store = makeConfigStore({});
    store.dispatch(viewActions.setHomeScreenIsOpen(true));
    const { message, local } = agentMessage('m1');
    const seen: Array<[number, boolean]> = [];
    store.subscribe(() => {
      const state = store.getState();
      seen.push([
        state.assistantMessageState.localMessageIDs.length,
        state.view.persistedToBrowserStorage.homeScreenState.isHomeScreenOpen,
      ]);
    });

    store.dispatch(actions.addLocalMessageItem(local, message, true));

    expect(seen).toEqual([[1, false]]);
  });

  it('counts an agent message that arrives out of sight as unread, and clears it when an agent connects', () => {
    const store = makeConfigStore({});
    const { message, local } = agentMessage(
      'agent-1',
      HumanAgentMessageType.FROM_HUMAN_AGENT
    );

    store.dispatch(actions.addLocalMessageItem(local, message, true));
    expect(view(store).numUnreadMessages).toBe(1);

    const ended = agentMessage('agent-2', HumanAgentMessageType.CHAT_WAS_ENDED);
    store.dispatch(
      actions.addLocalMessageItem(ended.local, ended.message, true)
    );
    expect(view(store).numUnreadMessages).toBe(1);

    store.dispatch(setIsConnecting(true, null));
    expect(view(store).numUnreadMessages).toBe(0);
  });

  it('keeps the references of everything a view-only change leaves alone', () => {
    const store = makeConfigStore({});
    const before = store.getState();

    store.dispatch(viewActions.setViewValue('chatWidth', 640));

    const after = store.getState();
    expect(after.view.chatWidth).toBe(640);
    expect(after.allMessagesByID).toBe(before.allMessagesByID);
    expect(after.assistantMessageState).toBe(before.assistantMessageState);
    expect(after.humanAgentState).toBe(before.humanAgentState);
    expect(after.persistedToBrowserStorage).toBe(
      before.persistedToBrowserStorage
    );
    expect(after.view.customPanelState).toBe(before.view.customPanelState);
  });

  it('keeps its own references when a conversation action changes nothing in it', () => {
    const store = makeConfigStore({});
    const before = store.getState().view;

    store.dispatch(actions.setIsRestarting(true));

    expect(store.getState().isRestarting).toBe(true);
    expect(store.getState().view).toBe(before);
  });
});
