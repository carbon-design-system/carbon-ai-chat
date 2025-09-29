/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { AppState, HumanAgentDisplayState } from "../../types/state/AppState";
import { LanguagePack } from "../../types/config/PublicConfig";

const getBotInputState = (state: AppState) => state.botInputState;
const getHumanAgentInputState = (state: AppState) =>
  state.humanAgentState.inputState;
const getHumanAgentState = (state: AppState) => state.humanAgentState;
const getPersistedHumanAgent = (state: AppState) =>
  state.persistedToBrowserStorage.humanAgentState;

/**
 * Compute the display state for the agent.
 */
function selectHumanAgentDisplayState(state: AppState): HumanAgentDisplayState {
  const humanAgentState = getHumanAgentState(state);
  const persisted = getPersistedHumanAgent(state);

  if (persisted.isSuspended) {
    return {
      isConnectingOrConnected: false,
      disableInput: false,
      isHumanAgentTyping: false,
      inputPlaceholderKey: null,
    };
  }

  const { isReconnecting, isConnecting, isHumanAgentTyping } = humanAgentState;
  const { isConnected } = persisted;

  let inputPlaceholderKey: keyof LanguagePack;
  if (isConnecting) {
    inputPlaceholderKey = "agent_inputPlaceholderConnecting";
  } else if (isReconnecting) {
    inputPlaceholderKey = "agent_inputPlaceholderReconnecting";
  } else {
    inputPlaceholderKey = null;
  }

  return {
    isHumanAgentTyping,
    isConnectingOrConnected: isConnecting || isConnected,
    disableInput: isConnecting || isReconnecting,
    inputPlaceholderKey,
  };
}

/**
 * Is the chat currently routed to a human agent?
 */
function selectIsInputToHumanAgent(state: AppState): boolean {
  return selectHumanAgentDisplayState(state).isConnectingOrConnected;
}

/**
 * Pick either the agent’s input slice or the bot’s.
 */
function selectInputState(state: AppState) {
  return selectIsInputToHumanAgent(state)
    ? getHumanAgentInputState(state)
    : getBotInputState(state);
}

export {
  selectHumanAgentDisplayState,
  selectIsInputToHumanAgent,
  selectInputState,
};
