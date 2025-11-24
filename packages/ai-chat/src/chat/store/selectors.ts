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

const getAssistantInputState = (state: AppState) => state.assistantInputState;
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
 * Pick either the agent's input slice or the bot's.
 */
function selectInputState(state: AppState) {
  return selectIsInputToHumanAgent(state)
    ? getHumanAgentInputState(state)
    : getAssistantInputState(state);
}

/**
 * Determines if the currently open panel has a back button visible.
 * Returns true if any panel with a back button is open.
 */
function selectHasOpenPanelWithBackButton(state: AppState): boolean {
  const {
    iFramePanelState,
    viewSourcePanelState,
    responsePanelState,
    customPanelState,
  } = state;

  // IFramePanel always has back button
  if (iFramePanelState.isOpen) {
    return true;
  }

  // ViewSourcePanel always has back button
  if (viewSourcePanelState.isOpen) {
    return true;
  }

  // ResponsePanel always has back button
  if (responsePanelState.isOpen) {
    return true;
  }

  // CustomPanel has back button unless explicitly hidden
  if (customPanelState.isOpen && !customPanelState.options.hideBackButton) {
    return true;
  }

  return false;
}

export {
  selectHumanAgentDisplayState,
  selectIsInputToHumanAgent,
  selectInputState,
  selectHasOpenPanelWithBackButton,
};
