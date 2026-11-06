/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cloneDeep from 'lodash-es/cloneDeep.js';
import { ServiceManager } from '../services/ServiceManager';
import {
  ConversationAppConfig,
  ConversationConfig,
  ConversationState,
} from '../../types/state/ConversationState';
import { PersistedState } from '../../types/state/PersistedState';
import { LanguagePack } from '../../types/config/LanguagePack';
import { DeepPartial } from '../../types/utilities/DeepPartial';
import { reducers } from './reducers';
import { AppStore, createAppStore } from './appStore';
import { enableMessageOwnership } from './messageOwnership';
import {
  DEFAULT_INPUT_STATE,
  DEFAULT_MESSAGE_STATE,
  DEFAULT_PERSISTED_TO_BROWSER,
  DEFAULT_HUMAN_AGENT_STATE,
} from './reducerUtils';
import { enLanguagePack } from '../../types/config/LanguagePack';
import { fromPersistableState } from './persistenceUtils';
import {
  humanAgentStateConfig,
  pickHumanAgentState,
} from './humanAgentStatePersistence';

/**
 * Builds the active language pack: the `enLanguagePack` defaults overlaid with
 * any host-provided `strings`. The language pack is a flat key→string map, so a
 * shallow overlay is sufficient (and matches the dynamic-update path). Lives in
 * its own `ConversationState.languagePack` slice so a string change never churns the
 * config tree. Shared by boot, the dynamic `strings` effect, and the dynamic
 * config path so they all merge identically.
 */
function buildLanguagePack(
  strings?: DeepPartial<LanguagePack> | undefined
): LanguagePack {
  return { ...enLanguagePack, ...(strings ?? {}) } as LanguagePack;
}

function createInitialState(config: ConversationAppConfig): ConversationState {
  // Input config (isVisible/isDisabled/isReadonly) is intentionally NOT mirrored
  // into state at boot. Those values are derived from config at read time via
  // the selectInput* selectors; assistantInputState only carries runtime
  // overrides, which start unset (null).
  const assistantInputState = { ...DEFAULT_INPUT_STATE };

  return {
    // Config with derived values
    config,

    // Active language pack (defaults + host `strings`), kept off the config tree.
    languagePack: buildLanguagePack(config.public.strings),

    // Messaging state
    ...DEFAULT_MESSAGE_STATE,

    isRestarting: false,
    conversationStatus: 'ready',

    // Input state
    assistantInputState,

    // Lifecycle state
    isHydrated: false,

    // The conversation's half of the saved session.
    persistedToBrowserStorage: {
      hasSentNonWelcomeMessage:
        DEFAULT_PERSISTED_TO_BROWSER.hasSentNonWelcomeMessage,
      humanAgentState: cloneDeep(DEFAULT_PERSISTED_TO_BROWSER.humanAgentState),
    },

    // Agent UI State
    humanAgentState: DEFAULT_HUMAN_AGENT_STATE,
  };
}

/**
 * The saved session the chat restores at boot, or null for a new one. When
 * the host owns persistence (`config.persistedState`), it's the host's
 * `initialState`; otherwise it's the session storage copy, if any. The shell
 * reads the view half of the same value.
 */
function loadSavedSession(
  publicConfig: ConversationConfig,
  serviceManager: ServiceManager
): PersistedState | null {
  // Load once per chat: loading can clear a stale session from storage.
  if (savedSessions.has(serviceManager)) {
    return savedSessions.get(serviceManager);
  }
  const saved = readSavedSession(publicConfig, serviceManager);
  savedSessions.set(serviceManager, saved);
  return saved;
}

/** The saved session each chat loaded at boot. */
const savedSessions = new WeakMap<object, PersistedState | null>();

function readSavedSession(
  publicConfig: ConversationConfig,
  serviceManager: ServiceManager
): PersistedState | null {
  const persistedStateConfig = publicConfig.persistedState;
  const externallyPersisted = Boolean(
    persistedStateConfig?.initialState || persistedStateConfig?.onStateChange
  );
  if (externallyPersisted) {
    return persistedStateConfig?.initialState
      ? fromPersistableState(persistedStateConfig.initialState)
      : null;
  }
  return serviceManager.userSessionStorageService?.loadSession() ?? null;
}

/**
 * Creates the conversation's store. The shell builds `config` from its
 * `PublicConfig` and the values derived from it.
 */
function doCreateStore(
  config: ConversationAppConfig,
  serviceManager: ServiceManager
): AppStore<ConversationState> {
  const { public: publicConfig } = config;
  const initialState: ConversationState = createInitialState(config);

  // Restore the conversation's half of a saved session. The view partition
  // restores the rest when the shell attaches it.
  const saved = loadSavedSession(publicConfig, serviceManager);
  if (saved) {
    const { humanAgentState } = initialState.persistedToBrowserStorage;
    initialState.persistedToBrowserStorage = {
      hasSentNonWelcomeMessage:
        saved.hasSentNonWelcomeMessage ??
        initialState.persistedToBrowserStorage.hasSentNonWelcomeMessage,
      humanAgentState: {
        ...humanAgentState,
        ...saved.humanAgentState,
        responseUserProfiles: {
          ...humanAgentState.responseUserProfiles,
          ...saved.humanAgentState?.responseUserProfiles,
        },
      },
    };
  }

  // The SDK's agent connection config restores only that connection.
  const restoredAgent = humanAgentStateConfig(publicConfig)?.initialState;
  if (restoredAgent) {
    initialState.persistedToBrowserStorage = {
      ...initialState.persistedToBrowserStorage,
      humanAgentState: {
        ...initialState.persistedToBrowserStorage.humanAgentState,
        ...pickHumanAgentState(restoredAgent),
      },
    };
  }

  const store = createAppStore(reducerFunction, initialState);
  enableMessageOwnership(store);
  return store;
}

/**
 * This is the global reducer for the redux store. It will use the map of reducers from the "reducers" array to map
 * the action type to the sub-reducer for that specific action.
 */
function reducerFunction(
  state: ConversationState,
  action: { type: string; [key: string]: unknown } | undefined
): ConversationState {
  return action && reducers[action.type]
    ? reducers[action.type](state, action)
    : state;
}

export {
  doCreateStore,
  loadSavedSession,
  buildLanguagePack,
  createInitialState,
};
