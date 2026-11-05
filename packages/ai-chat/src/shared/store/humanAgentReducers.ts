/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ConversationState } from '../../types/state/AppState';
import {
  HA_END_CHAT,
  HA_SET_HUMAN_AGENT_AVAILABILITY,
  HA_SET_HUMAN_AGENT_JOINED,
  HA_SET_HUMAN_AGENT_LEFT_CHAT,
  HA_SET_IS_CONNECTING,
  HA_SET_IS_RECONNECTING,
  HA_SET_IS_SCREEN_SHARING,
  HA_SET_PERSISTED_STATE,
  HA_SET_SHOW_SCREEN_SHARE_REQUEST,
  HA_UPDATE_CAPABILITIES,
  HA_UPDATE_FILE_UPLOAD_IN_PROGRESS,
  HA_UPDATE_IS_SUSPENDED,
  HA_UPDATE_IS_TYPING,
} from './humanAgentActions';
import { type ReducerType } from './reducers';
import { ServiceDeskCapabilities } from '../../types/config/ServiceDeskConfig';
import { applyLocalMessageUIState } from './reducerUtils';
import { ResponseUserProfile } from '../../types/messaging/Messages';

/**
 * Redux reducers for human agent actions.
 */

const humanAgentReducers: { [key: string]: ReducerType } = {
  [HA_SET_IS_CONNECTING]: (
    state: ConversationState,
    action: { isConnecting: boolean; localMessageID: string }
  ): ConversationState => {
    const { isConnecting, localMessageID } = action;
    return {
      ...state,
      humanAgentState: {
        ...state.humanAgentState,
        isConnecting,
        activeLocalMessageID: localMessageID,
      },
      persistedToBrowserStorage: {
        ...state.persistedToBrowserStorage,
        humanAgentState: {
          ...state.persistedToBrowserStorage.humanAgentState,
          isSuspended: isConnecting
            ? state.persistedToBrowserStorage.humanAgentState.isSuspended
            : false,
        },
      },
    };
  },

  [HA_SET_IS_RECONNECTING]: (
    state: ConversationState,
    action: { isReconnecting: boolean }
  ): ConversationState => {
    const { isReconnecting } = action;
    return {
      ...state,
      humanAgentState: {
        ...state.humanAgentState,
        isReconnecting,
      },
    };
  },

  [HA_SET_HUMAN_AGENT_AVAILABILITY]: (
    state: ConversationState,
    action: any
  ): ConversationState => {
    if (!state.humanAgentState.isConnecting) {
      // If the agent is not currently connecting, just ignore the availability update.
      return state;
    }
    return {
      ...state,
      humanAgentState: {
        ...state.humanAgentState,
        availability: state.humanAgentState.isConnecting
          ? action.availability
          : null,
      },
    };
  },

  [HA_SET_SHOW_SCREEN_SHARE_REQUEST]: (
    state: ConversationState,
    { showRequest }: any
  ): ConversationState => {
    return {
      ...state,
      humanAgentState: {
        ...state.humanAgentState,
        showScreenShareRequest: showRequest,
      },
    };
  },

  [HA_SET_HUMAN_AGENT_JOINED]: (
    state: ConversationState,
    action: { responseUserProfile?: ResponseUserProfile }
  ): ConversationState => {
    const responseUserProfiles = {
      ...state.persistedToBrowserStorage.humanAgentState.responseUserProfiles,
    };
    const { responseUserProfile } = action;
    if (responseUserProfile) {
      responseUserProfiles[responseUserProfile.id] = responseUserProfile;
    }

    return {
      ...state,
      humanAgentState: {
        ...state.humanAgentState,
        isConnecting: false,
        isReconnecting: false,
        availability: null,
      },
      persistedToBrowserStorage: {
        ...state.persistedToBrowserStorage,
        humanAgentState: {
          ...state.persistedToBrowserStorage.humanAgentState,
          isConnected: true,
          responseUserProfile,
          responseUserProfiles,
        },
      },
    };
  },

  [HA_SET_PERSISTED_STATE]: (
    state: ConversationState,
    action: { state: unknown }
  ): ConversationState => ({
    ...state,
    persistedToBrowserStorage: {
      ...state.persistedToBrowserStorage,
      humanAgentState: {
        ...state.persistedToBrowserStorage.humanAgentState,
        serviceDeskState: action.state,
      },
    },
  }),

  [HA_UPDATE_IS_SUSPENDED]: (
    state: ConversationState,
    action: { isSuspended: boolean }
  ): ConversationState => {
    if (
      !state.humanAgentState.isConnecting &&
      !state.persistedToBrowserStorage.humanAgentState.isConnected
    ) {
      // If the user is not connecting or connected to an agent, then we can't update the suspended state.
      return state;
    }
    return {
      ...state,
      persistedToBrowserStorage: {
        ...state.persistedToBrowserStorage,
        humanAgentState: {
          ...state.persistedToBrowserStorage.humanAgentState,
          isSuspended: action.isSuspended,
        },
      },
    };
  },

  [HA_UPDATE_IS_TYPING]: (
    state: ConversationState,
    action: { isTyping: boolean }
  ): ConversationState => {
    return {
      ...state,
      humanAgentState: {
        ...state.humanAgentState,
        isHumanAgentTyping: action.isTyping,
      },
    };
  },

  [HA_SET_HUMAN_AGENT_LEFT_CHAT]: (
    state: ConversationState
  ): ConversationState =>
    // Remove the agent's profile and typing indicator.
    ({
      ...state,
      assistantMessageState: {
        ...state.assistantMessageState,
      },
      humanAgentState: {
        ...state.humanAgentState,
        isHumanAgentTyping: false,
      },
      persistedToBrowserStorage: {
        ...state.persistedToBrowserStorage,
        humanAgentState: {
          ...state.persistedToBrowserStorage.humanAgentState,
          responseUserProfile: null,
        },
      },
    }),

  [HA_UPDATE_CAPABILITIES]: (
    state: ConversationState,
    action: { capabilities: ServiceDeskCapabilities }
  ): ConversationState => {
    const newInputState = {
      ...state.humanAgentState.inputState,
      ...action.capabilities,
    };
    if (!newInputState.allowFileUploads) {
      newInputState.files = [];
    }
    return {
      ...state,
      humanAgentState: {
        ...state.humanAgentState,
        inputState: newInputState,
      },
    };
  },

  [HA_SET_IS_SCREEN_SHARING]: (
    state: ConversationState,
    { isSharing }: { isSharing: boolean }
  ): ConversationState => ({
    ...state,
    humanAgentState: {
      ...state.humanAgentState,
      isScreenSharing: isSharing,
    },
  }),

  [HA_UPDATE_FILE_UPLOAD_IN_PROGRESS]: (
    state: ConversationState,
    action: { fileUploadInProgress: boolean }
  ): ConversationState => ({
    ...state,
    humanAgentState: {
      ...state.humanAgentState,
      fileUploadInProgress: action.fileUploadInProgress,
    },
  }),

  [HA_END_CHAT]: (state: ConversationState): ConversationState => {
    // Update the UI state of the current CTA message to indicate that chat was ended.
    let newState = applyLocalMessageUIState(
      state,
      state.humanAgentState.activeLocalMessageID,
      'wasHumanAgentChatEnded',
      true
    );

    // End the chat.
    newState = {
      ...newState,
      humanAgentState: {
        ...newState.humanAgentState,
        isConnecting: false,
        isReconnecting: false,
        availability: null,
        activeLocalMessageID: null,
        isHumanAgentTyping: false,
        inputState: {
          ...newState.humanAgentState.inputState,
          isReadonly: false,
        },
      },
      persistedToBrowserStorage: {
        ...state.persistedToBrowserStorage,
        humanAgentState: {
          ...state.persistedToBrowserStorage.humanAgentState,
          isConnected: false,
          isSuspended: false,
          responseUserProfile: null,
        },
      },
    };
    return newState;
  },
};

export { humanAgentReducers };
