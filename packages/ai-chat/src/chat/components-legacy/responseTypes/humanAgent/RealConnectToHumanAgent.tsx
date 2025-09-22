/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import Checkmark16 from "@carbon/icons/es/checkmark/16.js";
import Headset16 from "@carbon/icons/es/headset/16.js";
import HelpDesk16 from "@carbon/icons/es/help-desk/16.js";
import Logout16 from "@carbon/icons/es/logout/16.js";
import { carbonIconToReact } from "../../../utils/carbonIcon";
import Tile from "../../../components/carbon/Tile";
import Button from "../../../components/carbon/Button";
import React, { ReactNode, useState } from "react";

import { HasServiceManager } from "../../../hocs/withServiceManager";
import { HumanAgentsOnlineStatus } from "../../../services/haa/HumanAgentService";
import {
  HumanAgentDisplayState,
  HumanAgentState,
} from "../../../../types/state/AppState";
import { PersistedHumanAgentState } from "../../../../types/state/PersistedHumanAgentState";
import HasLanguagePack from "../../../../types/utilities/HasLanguagePack";
import { HasRequestFocus } from "../../../../types/utilities/HasRequestFocus";
import { LocalMessageItem } from "../../../../types/messaging/LocalMessageItem";
import { AvailabilityMessage } from "../../humanAgent/AvailabilityMessage";
import { EndHumanAgentChatModal } from "../../modals/EndHumanAgentChatModal";
import {
  ConnectToHumanAgentItem,
  MessageResponse,
} from "../../../../types/messaging/Messages";

const Checkmark = carbonIconToReact(Checkmark16);
const Headset = carbonIconToReact(Headset16);
const HelpDesk = carbonIconToReact(HelpDesk16);
const Logout = carbonIconToReact(Logout16);
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

  let ButtonIcon: (props: any) => ReactNode; // CarbonIconType is not exported, currently.
  // let ButtonIcon: React.FC<CarbonIconProps>;
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
      ButtonIcon = Checkmark;
      buttonText = languagePack.agent_cardButtonChatRequested;
      messageToUser = (
        <AvailabilityMessage
          availability={availability}
          fallbackText={languagePack.agent_connectWaiting}
        />
      );
    } else {
      ButtonIcon = Headset;
      buttonText = languagePack.agent_cardButtonConnected;
      messageToUser = languagePack.agent_cardMessageConnected;
    }
  } else if (disableUserInputs) {
    if (localMessage.ui_state.wasHumanAgentChatEnded) {
      ButtonIcon = Logout;
      buttonText = languagePack.agent_cardButtonChatEnded;
      messageToUser = languagePack.agent_cardMessageChatEnded;
    } else {
      ButtonIcon = Headset;
      buttonText = languagePack.agent_startChat;
    }
  } else {
    ButtonIcon = HelpDesk;
    buttonText = languagePack.agent_startChat;
  }

  return (
    <Tile className="cds-aichat--connect-to-human-agent">
      <div className="cds-aichat--connect-to-human-agent__title">
        <span>{languagePack.agent_chatTitle}</span>
      </div>
      <div className="cds-aichat--connect-to-human-agent__text">
        {messageToUser}
      </div>
      <Button
        className="cds-aichat--connect-to-human-agent__request-button"
        size="md"
        disabled={showDisabled}
        onClick={doStartChat}
      >
        <ButtonIcon slot="icon" />
        {buttonText}
      </Button>
      {!showDisabled && isSuspended && (
        <div className="cds-aichat--connect-to-human-agent__suspended-warning">
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
