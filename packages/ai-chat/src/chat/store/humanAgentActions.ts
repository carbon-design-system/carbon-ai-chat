/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  AgentAvailability,
  ServiceDeskCapabilities,
} from "../../types/config/ServiceDeskConfig";
import { ResponseUserProfile } from "../../types/messaging/Messages";

/**
 * Redux action creators for human agent actions.
 */

const HA_SET_HUMAN_AGENT_AVAILABILITY = "HA_SET_HUMAN_AGENT_AVAILABILITY";
const HA_SET_IS_CONNECTING = "HA_SET_IS_CONNECTING";
const HA_SET_IS_RECONNECTING = "HA_SET_IS_RECONNECTING";
const HA_SET_HUMAN_AGENT_JOINED = "HA_SET_HUMAN_AGENT_JOINED";
const HA_SET_HUMAN_AGENT_LEFT_CHAT = "HA_SET_HUMAN_AGENT_LEFT_CHAT";
const HA_END_CHAT = "HA_END_CHAT";
const HA_UPDATE_CAPABILITIES = "HA_UPDATE_CAPABILITIES";
const HA_UPDATE_FILE_UPLOAD_IN_PROGRESS = "HA_UPDATE_FILE_UPLOAD_IN_PROGRESS";
const HA_SET_SHOW_SCREEN_SHARE_REQUEST = "HA_SET_SHOW_SCREEN_SHARE_REQUEST";
const HA_SET_IS_SCREEN_SHARING = "HA_SET_IS_SCREEN_SHARING";
const HA_SET_PERSISTED_STATE = "HA_SET_PERSISTED_STATE";
const HA_UPDATE_IS_SUSPENDED = "HA_UPDATE_IS_SUSPENDED";
const HA_UPDATE_IS_TYPING = "HA_UPDATE_IS_TYPING";

/**
 * Sets the "is connecting" status for a human agent.
 */
function setIsConnecting(isConnecting: boolean, localMessageID: string) {
  return {
    type: HA_SET_IS_CONNECTING,
    isConnecting,
    localMessageID,
  };
}

/**
 * Sets the "is reconnecting" status for a human agent.
 */
function setIsReconnecting(isReconnecting: boolean) {
  return { type: HA_SET_IS_RECONNECTING, isReconnecting };
}

/**
 * Indicate agent has left chat.
 */
function setHumanAgentLeftChat() {
  return { type: HA_SET_HUMAN_AGENT_LEFT_CHAT };
}

/**
 * Ends the current chat.
 */
function endChat() {
  return { type: HA_END_CHAT };
}

/**
 * Sets the availability information for a user who is waiting to be connected to an agent.
 */
function setAgentAvailability(availability: AgentAvailability) {
  return {
    type: HA_SET_HUMAN_AGENT_AVAILABILITY,
    availability,
  };
}

/**
 * Sets the availability information for a user who is waiting to be connected to an agent.
 */
function setHumanAgentJoined(responseUserProfile: ResponseUserProfile) {
  return {
    type: HA_SET_HUMAN_AGENT_JOINED,
    responseUserProfile,
  };
}

/**
 * Updates Carbon AI Chat with the capabilities supported by the service desk.
 */
function updateCapabilities(capabilities: Partial<ServiceDeskCapabilities>) {
  return { type: HA_UPDATE_CAPABILITIES, capabilities };
}

/**
 * Updates the indicator for if any files are being uploaded.
 */
function updateFilesUploadInProgress(fileUploadInProgress: boolean) {
  return { type: HA_UPDATE_FILE_UPLOAD_IN_PROGRESS, fileUploadInProgress };
}

/**
 * Sets the state of the screen sharing modal.
 */
function setShowScreenShareRequest(showRequest: boolean) {
  return { type: HA_SET_SHOW_SCREEN_SHARE_REQUEST, showRequest };
}

/**
 * Sets the state of screen sharing.
 */
function setIsScreenSharing(isSharing: boolean) {
  return { type: HA_SET_IS_SCREEN_SHARING, isSharing };
}

/**
 * Updates the object that is stored containing state for the service desk.
 */
function setPersistedServiceDeskState(state: unknown) {
  return { type: HA_SET_PERSISTED_STATE, state };
}

/**
 * Updates the suspended status for the current service desk.
 */
function agentUpdateIsSuspended(isSuspended: boolean) {
  return { type: HA_UPDATE_IS_SUSPENDED, isSuspended };
}

/**
 * Updates the suspended status for the current service desk.
 */
function agentUpdateIsTyping(isTyping: boolean) {
  return { type: HA_UPDATE_IS_TYPING, isTyping };
}

export {
  HA_SET_HUMAN_AGENT_AVAILABILITY,
  HA_SET_HUMAN_AGENT_JOINED,
  HA_SET_HUMAN_AGENT_LEFT_CHAT,
  HA_END_CHAT,
  HA_SET_IS_CONNECTING,
  HA_UPDATE_CAPABILITIES,
  HA_UPDATE_FILE_UPLOAD_IN_PROGRESS,
  HA_SET_SHOW_SCREEN_SHARE_REQUEST,
  HA_SET_IS_SCREEN_SHARING,
  HA_SET_IS_RECONNECTING,
  HA_SET_PERSISTED_STATE,
  HA_UPDATE_IS_SUSPENDED,
  HA_UPDATE_IS_TYPING,
  setIsConnecting,
  setIsReconnecting,
  setAgentAvailability,
  setHumanAgentJoined,
  setHumanAgentLeftChat,
  endChat,
  updateCapabilities,
  updateFilesUploadInProgress,
  setShowScreenShareRequest,
  setIsScreenSharing,
  setPersistedServiceDeskState,
  agentUpdateIsSuspended,
  agentUpdateIsTyping,
};
