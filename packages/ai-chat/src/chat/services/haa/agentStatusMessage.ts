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
  HumanAgentMessageType,
  ResponseUserProfile,
} from "../../../types/messaging/Messages";
import { LanguagePack } from "../../../types/config/PublicConfig";

/**
 * Calculates the text to display for a given agent message type.
 */
function getHumanAgentStatusMessageText(
  agentMessageType: HumanAgentMessageType,
  responseUserProfile: ResponseUserProfile,
  intl: IntlShape,
) {
  const name = responseUserProfile?.nickname;

  let messageKey: keyof LanguagePack;
  switch (agentMessageType) {
    case HumanAgentMessageType.HUMAN_AGENT_JOINED: {
      messageKey = name ? "agent_agentJoinedName" : "agent_agentJoinedNoName";
      break;
    }
    case HumanAgentMessageType.RELOAD_WARNING: {
      messageKey = "agent_youConnectedWarning";
      break;
    }
    case HumanAgentMessageType.HUMAN_AGENT_LEFT_CHAT: {
      messageKey = name ? "agent_agentLeftChat" : "agent_agentLeftChatNoName";
      break;
    }
    case HumanAgentMessageType.HUMAN_AGENT_ENDED_CHAT: {
      messageKey = name ? "agent_agentEndedChat" : "agent_agentEndedChatNoName";
      break;
    }
    case HumanAgentMessageType.TRANSFER_TO_HUMAN_AGENT: {
      messageKey = name ? "agent_transferring" : "agent_transferringNoName";
      break;
    }
    case HumanAgentMessageType.USER_ENDED_CHAT: {
      messageKey = "agent_youEndedChat";
      break;
    }
    case HumanAgentMessageType.CHAT_WAS_ENDED: {
      messageKey = "agent_conversationWasEnded";
      break;
    }
    case HumanAgentMessageType.DISCONNECTED: {
      messageKey = "agent_disconnected";
      break;
    }
    case HumanAgentMessageType.RECONNECTED: {
      messageKey = "agent_reconnected";
      break;
    }
    case HumanAgentMessageType.SHARING_REQUESTED: {
      messageKey = "agent_sharingRequested";
      break;
    }
    case HumanAgentMessageType.SHARING_ACCEPTED: {
      messageKey = "agent_sharingAccepted";
      break;
    }
    case HumanAgentMessageType.SHARING_DECLINED: {
      messageKey = "agent_sharingDeclined";
      break;
    }
    case HumanAgentMessageType.SHARING_CANCELLED: {
      messageKey = "agent_sharingCancelled";
      break;
    }
    case HumanAgentMessageType.SHARING_ENDED: {
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

export { getHumanAgentStatusMessageText };
