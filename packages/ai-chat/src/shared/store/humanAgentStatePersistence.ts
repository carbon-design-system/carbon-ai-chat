/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The SDK's `humanAgentState` config: it saves and restores only the human
 * agent connection, the conversation's half of saved state. The prebuilt chat
 * saves its whole session through `persistedState` instead, which the shell
 * owns.
 */

import type { ChatSDKConfig } from '../../types/config/ChatSDKConfig';
import type { PersistedHumanAgentState } from '../../types/state/PersistedHumanAgentState';
import type { ServiceManager } from '../services/ServiceManager';

/** The fields of a saved agent connection. Anything else is ignored. */
const HUMAN_AGENT_STATE_KEYS = [
  'isConnected',
  'isSuspended',
  'responseUserProfile',
  'responseUserProfiles',
  'serviceDeskState',
] as const satisfies readonly (keyof PersistedHumanAgentState)[];

/** The `humanAgentState` config, when the chat was given one. */
function humanAgentStateConfig(config: object) {
  return (config as ChatSDKConfig).humanAgentState;
}

/**
 * The agent connection fields of a value a host restores. A host value can't
 * restore anything else, such as view state saved beside it.
 */
function pickHumanAgentState(
  value: PersistedHumanAgentState
): Partial<PersistedHumanAgentState> {
  const picked: Partial<Record<keyof PersistedHumanAgentState, unknown>> = {};
  HUMAN_AGENT_STATE_KEYS.forEach((key) => {
    if (value[key] !== undefined) {
      picked[key] = value[key];
    }
  });
  return picked as Partial<PersistedHumanAgentState>;
}

/**
 * Reports the agent connection to `humanAgentState.onStateChange` each time it
 * changes. Changes to anything else, including view state, report nothing.
 */
function reportHumanAgentStateOnChange(serviceManager: ServiceManager) {
  const { store } = serviceManager;
  let previous = store.getState().persistedToBrowserStorage.humanAgentState;
  return () => {
    const { persistedToBrowserStorage, config } = store.getState();
    const { humanAgentState } = persistedToBrowserStorage;
    if (humanAgentState === previous) {
      return;
    }
    previous = humanAgentState;
    humanAgentStateConfig(config.public)?.onStateChange?.(humanAgentState);
  };
}

export {
  humanAgentStateConfig,
  pickHumanAgentState,
  reportHumanAgentStateOnChange,
};
