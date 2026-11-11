/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { AppState } from '../../types/state/AppState';

import type { AppStore } from '../../shared/store/appStore';

import type { LoadingDirection } from '../../shared/services/messaging/presentationPort';

import { viewActions } from '../state';

/**
 * The view's message and chat loading counters, as the conversation layer
 * changes them through its ports. The conversation layer checks the
 * directions first.
 */
function createLoadingCounters(store: AppStore<AppState>) {
  const counters = () => store.getState().view;
  return {
    changeMessageLoadingCounter(amount: number) {
      store.dispatch(viewActions.addIsLoadingCounter(amount));
    },
    updateMessageLoadingCounter(direction: LoadingDirection, message?: string) {
      if (direction === 'reset') {
        store.dispatch(viewActions.resetIsLoadingCounter());
      } else if (direction === 'increase') {
        store.dispatch(viewActions.addIsLoadingCounter(1, message));
      } else if (direction === 'decrease') {
        if (counters().isMessageLoadingCounter > 0) {
          store.dispatch(viewActions.addIsLoadingCounter(-1, message));
        }
      } else {
        store.dispatch(viewActions.addIsLoadingCounter(0, message));
      }
    },
    changeChatLoadingCounter(amount: number) {
      store.dispatch(viewActions.addIsHydratingCounter(amount));
    },
    updateChatLoadingCounter(direction: LoadingDirection) {
      if (direction === 'reset') {
        store.dispatch(viewActions.resetIsHydratingCounter());
      } else if (direction === 'increase') {
        store.dispatch(viewActions.addIsHydratingCounter(1));
      } else if (counters().isHydratingCounter > 0) {
        store.dispatch(viewActions.addIsHydratingCounter(-1));
      }
    },
  };
}

export { createLoadingCounters };
