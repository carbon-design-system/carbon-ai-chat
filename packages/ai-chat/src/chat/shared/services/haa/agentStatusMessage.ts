/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { IntlShape } from "react-intl";

import {
  AgentMessageType,
  AgentProfile,
} from "../../../../types/messaging/Messages";
import { EnglishLanguagePack } from "../../../../types/instance/apiTypes";

/**
 * Calculates the text to display for a given agent message type.
 */
function getAgentStatusMessageText(
  agentMessageType: AgentMessageType,
  agentProfile: AgentProfile,
  intl: IntlShape
) {
  const name = agentProfile?.nickname;

  let messageKey: keyof EnglishLanguagePack;
  switch (agentMessageType) {
    case AgentMessageType.AGENT_JOINED: {
      messageKey = name ? "agent_agentJoinedName" : "agent_agentJoinedNoName";
      break;
    }
    case AgentMessageType.RELOAD_WARNING: {
      messageKey = "agent_youConnectedWarning";
      break;
    }
    case AgentMessageType.AGENT_LEFT_CHAT: {
      messageKey = name ? "agent_agentLeftChat" : "agent_agentLeftChatNoName";
      break;
    }
    case AgentMessageType.AGENT_ENDED_CHAT: {
      messageKey = name ? "agent_agentEndedChat" : "agent_agentEndedChatNoName";
      break;
    }
    case AgentMessageType.TRANSFER_TO_AGENT: {
      messageKey = name ? "agent_transferring" : "agent_transferringNoName";
      break;
    }
    case AgentMessageType.USER_ENDED_CHAT: {
      messageKey = "agent_youEndedChat";
      break;
    }
    case AgentMessageType.CHAT_WAS_ENDED: {
      messageKey = "agent_conversationWasEnded";
      break;
    }
    case AgentMessageType.DISCONNECTED: {
      messageKey = "agent_disconnected";
      break;
    }
    case AgentMessageType.RECONNECTED: {
      messageKey = "agent_reconnected";
      break;
    }
    case AgentMessageType.SHARING_REQUESTED: {
      messageKey = "agent_sharingRequested";
      break;
    }
    case AgentMessageType.SHARING_ACCEPTED: {
      messageKey = "agent_sharingAccepted";
      break;
    }
    case AgentMessageType.SHARING_DECLINED: {
      messageKey = "agent_sharingDeclined";
      break;
    }
    case AgentMessageType.SHARING_CANCELLED: {
      messageKey = "agent_sharingCancelled";
      break;
    }
    case AgentMessageType.SHARING_ENDED: {
      messageKey = "agent_sharingEnded";
      break;
    }
    default:
      return "";
  }

  return (
    messageKey && intl.formatMessage({ id: messageKey }, { personName: name })
  );
}

export { getAgentStatusMessageText };
