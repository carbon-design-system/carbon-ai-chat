/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act } from '@testing-library/react';
import type { PublicConfig } from '../../../types/config/PublicConfig';
import {
  createStoreFromReduction,
  type AppStore,
} from '../../../sdk/store/appStore';
import { enableMessageOwnership } from '../../../sdk/store/messageOwnership';
import type {
  AppState,
  ConversationState,
} from '../../../types/state/AppState';
import { reduceWithMessageOwnership } from '../../../sdk/store/reducers';
import actions from '../../../sdk/store/actions';
import isEqual from 'lodash-es/isEqual.js';
import {
  buildLanguagePack,
  createInitialState,
} from '../../../sdk/store/doCreateStore';
import { createDerivedConfig } from '../../utils/appConfig';
import { viewActions } from '../../state';
import { reconcileAppConfigReferences } from '../../../sdk/utils/reconcileConfig';
import { chatStore } from '../../services/attachChatView';
import { attachStorePartition } from '../../../sdk/store/attachStorePartition';
import { viewReducer } from '../../state/reducer';
import { createInitialViewState } from '../../state/initialState';

/**
 * Runs one action through both partitions the way the store does: the
 * conversation reducer, then the view's with the conversation state after it
 * and before it.
 */
export function appRootReducer(
  state: AppState,
  action: { type: string; [key: string]: unknown }
): AppState {
  const conversation = reduceWithMessageOwnership(state, action)
    .state as AppState;
  const view = viewReducer(state.view, action, conversation, state);
  return Object.is(view, conversation.view)
    ? conversation
    : { ...conversation, view };
}

/**
 * Builds a real store seeded from a PublicConfig, exactly the way doCreateStore
 * does. Use with {@link applyConfigChange} to drive runtime config updates in
 * re-render tests.
 */
export function makeConfigStore(config: PublicConfig): AppStore<AppState> {
  const store = createStoreFromReduction<ConversationState>(
    reduceWithMessageOwnership,
    createInitialState({ public: config })
  );
  enableMessageOwnership(store);
  return withView(store, config);
}

/**
 * Attaches the view partition to a store made without the shell, as a mounted
 * chat does at boot, and returns the store typed for `chat/`.
 */
export function withView(
  store: AppStore<ConversationState>,
  config: PublicConfig = {}
): AppStore<AppState> {
  attachStorePartition(
    { store },
    'view',
    viewReducer,
    createInitialViewState(config, null)
  );
  return store as unknown as AppStore<AppState>;
}

/**
 * Applies a runtime config change the way `applyConfigChangesDynamically` does:
 * reconcile references against the stored config, dispatch the wholesale
 * `changeState({ config })`, then the view's derived values. Reference
 * reconciliation is what lets narrowed selectors skip re-rendering on
 * unrelated changes.
 */
export function applyConfigChange(
  store: AppStore<ConversationState>,
  nextConfig: PublicConfig
): void {
  const prevConfig = chatStore({ store }).getState().config;
  const reconciled = reconcileAppConfigReferences(prevConfig, {
    public: nextConfig,
  });
  act(() => {
    store.dispatch(actions.changeState({ config: reconciled }));
    // Mirror applyConfigChangesDynamically: the language pack lives in its own
    // slice, so a config-provided `strings` change is synced separately (and
    // only when `strings` actually changed, so unrelated config edits don't
    // churn it).
    if (!isEqual(prevConfig.public.strings, nextConfig.strings)) {
      const nextLanguagePack = buildLanguagePack(nextConfig.strings);
      if (!isEqual(store.getState().languagePack, nextLanguagePack)) {
        store.dispatch(
          actions.setAppStateValue('languagePack', nextLanguagePack)
        );
      }
    }
    store.dispatch(
      viewActions.setDerivedConfig(createDerivedConfig(nextConfig))
    );
  });
}
