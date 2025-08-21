/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import Checkmark from "@carbon/icons-react/es/Checkmark.js";
import Headset from "@carbon/icons-react/es/Headset.js";
import HelpDesk from "@carbon/icons-react/es/HelpDesk.js";
import Logout from "@carbon/icons-react/es/Logout.js";
import { Button, Tile } from "@carbon/react";
import React, { ReactNode, useState } from "react";

import { HasServiceManager } from "../../../hocs/withServiceManager";
import { HumanAgentsOnlineStatus } from "../../../services/haa/HumanAgentService";
import {
  HumanAgentDisplayState,
  HumanAgentState,
} from "../../../../../types/state/AppState";
import HasLanguagePack from "../../../../../types/utilities/HasLanguagePack";
import { HasRequestFocus } from "../../../../../types/utilities/HasRequestFocus";
import { LocalMessageItem } from "../../../../../types/messaging/LocalMessageItem";
import { PersistedHumanAgentState } from "../../../../../types/state/PersistedHumanAgentState";
import { AvailabilityMessage } from "../../humanAgent/AvailabilityMessage";
import { EndHumanAgentChatModal } from "../../modals/EndHumanAgentChatModal";
import {
  ConnectToHumanAgentItem,
  MessageResponse,
} from "../../../../../types/messaging/Messages";

interface RealConnectToHumanAgentProps
  extends HasLanguagePack,
    HasServiceManager,
    HasRequestFocus {
  /**
   * Indicates if the "start chat" button should be disabled.
   */
  disableUserInputs: boolean;

  /**
   * The "connect_to_agent" message that generated this card.
   */
  localMessage: LocalMessageItem<ConnectToHumanAgentItem>;

  /**
   * The "connect_to_agent" message that generated this card.
   */
  originalMessage: MessageResponse;

  /**
   * The current application agent state.
   */
  humanAgentState: HumanAgentState;

  /**
   * The current persisted agent state.
   */
  persistedHumanAgentState: PersistedHumanAgentState;

  /**
   * The current application agent state.
   */
  agentDisplayState: HumanAgentDisplayState;
}

/**
 * This component is displayed to the user when a "connect to agent" response comes back from the server. This
 * informs the user that we are able to connect them to a human agent and display a confirmation asking if they do
 * want to connect.
 *
 * This is the "real" component that is displayed to users as opposed to the "preview" component that is displayed
 * for users using the preview link.
 */
function RealConnectToHumanAgent(props: RealConnectToHumanAgentProps) {
  const {
    languagePack,
    localMessage,
    originalMessage,
    disableUserInputs,
    serviceManager,
    humanAgentState,
    requestFocus,
    agentDisplayState,
    persistedHumanAgentState,
  } = props;
  const { activeLocalMessageID, availability, isConnecting } = humanAgentState;
  const { isSuspended } = persistedHumanAgentState;

  const [showConfirmSuspended, setShowConfirmSuspended] = useState(false);

  if (!isSuspended && showConfirmSuspended) {
    // This can happen if the user is disconnected while waiting for the confirmation.
    setShowConfirmSuspended(false);
  }

  function doStartChat() {
    if (isSuspended && !showConfirmSuspended) {
      // If there is already a suspended chat and we're not showing the confirmation modal, then we need to confirm
      // first.
      setShowConfirmSuspended(true);
    } else {
      setShowConfirmSuspended(false);
      serviceManager.humanAgentService.startChat(localMessage, originalMessage);
      // The connect button will become disabled. We need to move focus to the cancel button but do so in a timeout to
      // give it a chance to render.
      setTimeout(requestFocus);
    }
  }

  const noHumanAgentsWereOnline =
    originalMessage.ui_state_internal?.agent_availability ===
    HumanAgentsOnlineStatus.OFFLINE;
  if (noHumanAgentsWereOnline) {
    // Display the "agents are not available" message that was configured in the skill or show a default value if
    // there is none.
    const agentUnavailableMessage =
      localMessage.item.agent_unavailable?.message ||
      languagePack.default_agent_unavailableMessage;
    return <div>{agentUnavailableMessage}</div>;
  }

  const textFromMessage =
    localMessage.item.agent_available?.message ||
    languagePack.default_agent_availableMessage;

  let buttonIcon: (props: any) => ReactNode; // CarbonIconType is not exported, currently.
  let buttonText: string;
  let showDisabled: boolean =
    disableUserInputs || agentDisplayState.isConnectingOrConnected;
  let messageToUser: React.ReactNode = textFromMessage;

  if (localMessage.ui_state.id === activeLocalMessageID) {
    // This card is the active card in a chat that has been started.
    showDisabled = true;
    if (isConnecting) {
      // In the connecting state, the text on the card changes as the availability information is updated by the
      // service desk integration.
      buttonIcon = Checkmark;
      buttonText = languagePack.agent_cardButtonChatRequested;
      messageToUser = (
        <AvailabilityMessage
          availability={availability}
          fallbackText={languagePack.agent_connectWaiting}
        />
      );
    } else {
      buttonIcon = Headset;
      buttonText = languagePack.agent_cardButtonConnected;
      messageToUser = languagePack.agent_cardMessageConnected;
    }
  } else if (disableUserInputs) {
    if (localMessage.ui_state.wasHumanAgentChatEnded) {
      buttonIcon = Logout;
      buttonText = languagePack.agent_cardButtonChatEnded;
      messageToUser = languagePack.agent_cardMessageChatEnded;
    } else {
      buttonIcon = Headset;
      buttonText = languagePack.agent_startChat;
    }
  } else {
    buttonIcon = HelpDesk;
    buttonText = languagePack.agent_startChat;
  }

  return (
    <Tile className="WACConnectToHumanAgent">
      <div className="WACConnectToHumanAgent__Title">
        <span>{languagePack.agent_chatTitle}</span>
      </div>
      <div className="WACConnectToHumanAgent__Text">{messageToUser}</div>
      <Button
        className="WACConnectToHumanAgent__RequestButton"
        size="md"
        disabled={showDisabled}
        onClick={doStartChat}
        renderIcon={buttonIcon}
      >
        {buttonText}
      </Button>
      {!showDisabled && isSuspended && (
        <div className="WACConnectToHumanAgent__SuspendedWarning">
          {languagePack.agent_suspendedWarning}
        </div>
      )}
      {showConfirmSuspended && (
        <EndHumanAgentChatModal
          title={languagePack.agent_confirmSuspendedEndChatTitle}
          message={languagePack.agent_confirmSuspendedEndChatMessage}
          onConfirm={doStartChat}
          onCancel={() => setShowConfirmSuspended(false)}
        />
      )}
    </Tile>
  );
}

export { RealConnectToHumanAgent };
