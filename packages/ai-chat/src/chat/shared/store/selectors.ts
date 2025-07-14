/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { AppState, AgentDisplayState } from "../../../types/state/AppState";
import { EnglishLanguagePack } from "../../../types/instance/apiTypes";

/** Simple “getters” for the raw pieces of state */
const getBotInputState = (state: AppState) => state.botInputState;
const getAgentInputState = (state: AppState) => state.agentState.inputState;
const getAgentState = (state: AppState) => state.agentState;
const getPersistedAgent = (state: AppState) =>
  state.persistedToBrowserStorage.chatState.agentState;

/**
 * Compute the display state for the agent.
 */
function selectAgentDisplayState(state: AppState): AgentDisplayState {
  const agentState = getAgentState(state);
  const persisted = getPersistedAgent(state);

  if (persisted.isSuspended) {
    return {
      isConnectingOrConnected: false,
      disableInput: false,
      isAgentTyping: false,
      inputPlaceholderKey: null,
    };
  }

  const { isReconnecting, isConnecting, isAgentTyping } = agentState;
  const { isConnected } = persisted;

  let inputPlaceholderKey: keyof EnglishLanguagePack;
  if (isConnecting) {
    inputPlaceholderKey = "agent_inputPlaceholderConnecting";
  } else if (isReconnecting) {
    inputPlaceholderKey = "agent_inputPlaceholderReconnecting";
  } else {
    inputPlaceholderKey = null;
  }

  return {
    isAgentTyping,
    isConnectingOrConnected: isConnecting || isConnected,
    disableInput: isConnecting || isReconnecting,
    inputPlaceholderKey,
  };
}

/**
 * Is the chat currently routed to a human agent?
 */
function selectIsInputToAgent(state: AppState): boolean {
  return selectAgentDisplayState(state).isConnectingOrConnected;
}

/**
 * Pick either the agent’s input slice or the bot’s.
 */
function selectInputState(state: AppState) {
  return selectIsInputToAgent(state)
    ? getAgentInputState(state)
    : getBotInputState(state);
}

export { selectAgentDisplayState, selectIsInputToAgent, selectInputState };
