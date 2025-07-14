/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { AppState } from "../../../types/state/AppState";
import {
  HA_END_CHAT,
  HA_SET_AGENT_AVAILABILITY,
  HA_SET_AGENT_JOINED,
  HA_SET_AGENT_LEFT_CHAT,
  HA_SET_IS_CONNECTING,
  HA_SET_IS_RECONNECTING,
  HA_SET_IS_SCREEN_SHARING,
  HA_SET_PERSISTED_STATE,
  HA_SET_SHOW_SCREEN_SHARE_REQUEST,
  HA_UPDATE_CAPABILITIES,
  HA_UPDATE_FILE_UPLOAD_IN_PROGRESS,
  HA_UPDATE_IS_SUSPENDED,
  HA_UPDATE_IS_TYPING,
} from "./agentActions";
import { type ReducerType } from "./reducers";
import { ServiceDeskCapabilities } from "../../../types/config/ServiceDeskConfig";
import { applyLocalMessageUIState } from "./reducerUtils";
import { AgentProfile } from "../../../types/messaging/Messages";

/**
 * Redux reducers for human agent actions.
 */

const agentReducers: { [key: string]: ReducerType } = {
  [HA_SET_IS_CONNECTING]: (
    state: AppState,
    action: { isConnecting: boolean; localMessageID: string }
  ): AppState => {
    const { isConnecting, localMessageID } = action;
    return {
      ...state,
      agentState: {
        ...state.agentState,
        isConnecting,
        activeLocalMessageID: localMessageID,
        // When connecting, clear any unread messages from a previous conversation.
        numUnreadMessages: isConnecting
          ? 0
          : state.agentState.numUnreadMessages,
      },
      persistedToBrowserStorage: {
        ...state.persistedToBrowserStorage,
        chatState: {
          ...state.persistedToBrowserStorage.chatState,
          agentState: {
            ...state.persistedToBrowserStorage.chatState.agentState,
            isSuspended: isConnecting
              ? state.persistedToBrowserStorage.chatState.agentState.isSuspended
              : false,
          },
        },
      },
    };
  },

  [HA_SET_IS_RECONNECTING]: (
    state: AppState,
    action: { isReconnecting: boolean }
  ): AppState => {
    const { isReconnecting } = action;
    return {
      ...state,
      agentState: {
        ...state.agentState,
        isReconnecting,
      },
    };
  },

  [HA_SET_AGENT_AVAILABILITY]: (state: AppState, action: any): AppState => {
    if (!state.agentState.isConnecting) {
      // If the agent is not currently connecting, just ignore the availability update.
      return state;
    }
    return {
      ...state,
      agentState: {
        ...state.agentState,
        availability: state.agentState.isConnecting
          ? action.availability
          : null,
      },
    };
  },

  [HA_SET_SHOW_SCREEN_SHARE_REQUEST]: (
    state: AppState,
    { showRequest }: any
  ): AppState => {
    return {
      ...state,
      agentState: {
        ...state.agentState,
        showScreenShareRequest: showRequest,
      },
    };
  },

  [HA_SET_AGENT_JOINED]: (
    state: AppState,
    action: { agentProfile?: AgentProfile }
  ): AppState => {
    const agentProfiles = {
      ...state.persistedToBrowserStorage.chatState.agentState.agentProfiles,
    };
    const { agentProfile } = action;
    if (agentProfile) {
      agentProfiles[agentProfile.id] = agentProfile;
    }

    return {
      ...state,
      agentState: {
        ...state.agentState,
        isConnecting: false,
        isReconnecting: false,
        availability: null,
      },
      persistedToBrowserStorage: {
        ...state.persistedToBrowserStorage,
        chatState: {
          ...state.persistedToBrowserStorage.chatState,
          agentState: {
            ...state.persistedToBrowserStorage.chatState.agentState,
            isConnected: true,
            agentProfile,
            agentProfiles,
          },
        },
      },
    };
  },

  [HA_SET_PERSISTED_STATE]: (
    state: AppState,
    action: { state: unknown }
  ): AppState => ({
    ...state,
    persistedToBrowserStorage: {
      ...state.persistedToBrowserStorage,
      chatState: {
        ...state.persistedToBrowserStorage.chatState,
        agentState: {
          ...state.persistedToBrowserStorage.chatState.agentState,
          serviceDeskState: action.state,
        },
      },
    },
  }),

  [HA_UPDATE_IS_SUSPENDED]: (
    state: AppState,
    action: { isSuspended: boolean }
  ): AppState => {
    if (
      !state.agentState.isConnecting &&
      !state.persistedToBrowserStorage.chatState.agentState.isConnected
    ) {
      // If the user is not connecting or connected to an agent, then we can't update the suspended state.
      return state;
    }
    return {
      ...state,
      persistedToBrowserStorage: {
        ...state.persistedToBrowserStorage,
        chatState: {
          ...state.persistedToBrowserStorage.chatState,
          agentState: {
            ...state.persistedToBrowserStorage.chatState.agentState,
            isSuspended: action.isSuspended,
          },
        },
      },
    };
  },

  [HA_UPDATE_IS_TYPING]: (
    state: AppState,
    action: { isTyping: boolean }
  ): AppState => {
    return {
      ...state,
      agentState: {
        ...state.agentState,
        isAgentTyping: action.isTyping,
      },
    };
  },

  [HA_SET_AGENT_LEFT_CHAT]: (state: AppState): AppState =>
    // Remove the agent's profile and typing indicator.
    ({
      ...state,
      botMessageState: {
        ...state.botMessageState,
      },
      agentState: {
        ...state.agentState,
        isAgentTyping: false,
      },
      persistedToBrowserStorage: {
        ...state.persistedToBrowserStorage,
        chatState: {
          ...state.persistedToBrowserStorage.chatState,
          agentState: {
            ...state.persistedToBrowserStorage.chatState.agentState,
            agentProfile: null,
          },
        },
      },
    }),

  [HA_UPDATE_CAPABILITIES]: (
    state: AppState,
    action: { capabilities: ServiceDeskCapabilities }
  ): AppState => {
    const newInputState = {
      ...state.agentState.inputState,
      ...action.capabilities,
    };
    if (!newInputState.allowFileUploads) {
      newInputState.files = [];
    }
    return {
      ...state,
      agentState: {
        ...state.agentState,
        inputState: newInputState,
      },
    };
  },

  [HA_SET_IS_SCREEN_SHARING]: (
    state: AppState,
    { isSharing }: { isSharing: boolean }
  ): AppState => ({
    ...state,
    agentState: {
      ...state.agentState,
      isScreenSharing: isSharing,
    },
  }),

  [HA_UPDATE_FILE_UPLOAD_IN_PROGRESS]: (
    state: AppState,
    action: { fileUploadInProgress: boolean }
  ): AppState => ({
    ...state,
    agentState: {
      ...state.agentState,
      fileUploadInProgress: action.fileUploadInProgress,
    },
  }),

  [HA_END_CHAT]: (state: AppState): AppState => {
    // Update the UI state of the current CTA message to indicate that chat was ended.
    let newState = applyLocalMessageUIState(
      state,
      state.agentState.activeLocalMessageID,
      "wasAgentChatEnded",
      true
    );

    // End the chat.
    newState = {
      ...newState,
      agentState: {
        ...newState.agentState,
        isConnecting: false,
        isReconnecting: false,
        availability: null,
        activeLocalMessageID: null,
        isAgentTyping: false,
        inputState: {
          ...newState.agentState.inputState,
          isReadonly: false,
        },
      },
      persistedToBrowserStorage: {
        ...state.persistedToBrowserStorage,
        chatState: {
          ...state.persistedToBrowserStorage.chatState,
          agentState: {
            ...state.persistedToBrowserStorage.chatState.agentState,
            isConnected: false,
            isSuspended: false,
            agentProfile: null,
          },
        },
      },
    };
    return newState;
  },
};

export { agentReducers };
