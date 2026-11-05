/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import actions from '../../shared/store/actions';
import type { AppState } from '../../types/state/AppState';
import type { AppStore } from '../../shared/store/appStore';
import type { LoadingDirection } from '../../shared/services/messaging/presentationPort';

/**
 * The view's message and chat loading counters, as the conversation layer
 * changes them through its ports. The conversation layer checks the
 * directions first.
 */
function createLoadingCounters(store: AppStore<AppState>) {
  const counters = () => store.getState().assistantMessageState;
  return {
    changeMessageLoadingCounter(amount: number) {
      store.dispatch(actions.addIsLoadingCounter(amount));
    },
    updateMessageLoadingCounter(direction: LoadingDirection, message?: string) {
      if (direction === 'reset') {
        store.dispatch(actions.resetIsLoadingCounter());
      } else if (direction === 'increase') {
        store.dispatch(actions.addIsLoadingCounter(1, message));
      } else if (direction === 'decrease') {
        if (counters().isMessageLoadingCounter > 0) {
          store.dispatch(actions.addIsLoadingCounter(-1, message));
        }
      } else {
        store.dispatch(actions.addIsLoadingCounter(0, message));
      }
    },
    changeChatLoadingCounter(amount: number) {
      store.dispatch(actions.addIsHydratingCounter(amount));
    },
    updateChatLoadingCounter(direction: LoadingDirection) {
      if (direction === 'reset') {
        store.dispatch(actions.resetIsHydratingCounter());
      } else if (direction === 'increase') {
        store.dispatch(actions.addIsHydratingCounter(1));
      } else if (counters().isHydratingCounter > 0) {
        store.dispatch(actions.addIsHydratingCounter(-1));
      }
    },
  };
}

export { createLoadingCounters };
