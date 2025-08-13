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
import { Tile } from "@carbon/react";
import Button from "../../../../react/carbon/Button";
import React, { ReactNode, useState } from "react";

import { HasServiceManager } from "../../../hocs/withServiceManager";
import { AgentsOnlineStatus } from "../../../services/haa/HumanAgentService";
import {
  AgentDisplayState,
  AgentState,
} from "../../../../../types/state/AppState";
import HasLanguagePack from "../../../../../types/utilities/HasLanguagePack";
import { HasRequestFocus } from "../../../../../types/utilities/HasRequestFocus";
import { LocalMessageItem } from "../../../../../types/messaging/LocalMessageItem";
import { PersistedAgentState } from "../../../../../types/state/PersistedAgentState";
import { AvailabilityMessage } from "../../agent/AvailabilityMessage";
import { EndAgentChatModal } from "../../modals/EndAgentChatModal";
import {
  ConnectToAgentItem,
  MessageResponse,
} from "../../../../../types/messaging/Messages";

const Checkmark = carbonIconToReact(Checkmark16);
const Headset = carbonIconToReact(Headset16);
const HelpDesk = carbonIconToReact(HelpDesk16);
const Logout = carbonIconToReact(Logout16);

interface RealConnectToAgentProps
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
  localMessage: LocalMessageItem<ConnectToAgentItem>;

  /**
   * The "connect_to_agent" message that generated this card.
   */
  originalMessage: MessageResponse;

  /**
   * The current application agent state.
   */
  agentState: AgentState;

  /**
   * The current persisted agent state.
   */
  persistedAgentState: PersistedAgentState;

  /**
   * The current application agent state.
   */
  agentDisplayState: AgentDisplayState;
}

/**
 * This component is displayed to the user when a "connect to agent" response comes back from the server. This
 * informs the user that we are able to connect them to a human agent and display a confirmation asking if they do
 * want to connect.
 *
 * This is the "real" component that is displayed to users as opposed to the "preview" component that is displayed
 * for users using the preview link.
 */
function RealConnectToAgent(props: RealConnectToAgentProps) {
  const {
    languagePack,
    localMessage,
    originalMessage,
    disableUserInputs,
    serviceManager,
    agentState,
    requestFocus,
    agentDisplayState,
    persistedAgentState,
  } = props;
  const { activeLocalMessageID, availability, isConnecting } = agentState;
  const { isSuspended } = persistedAgentState;

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

  const noAgentsWereOnline =
    originalMessage.history.agent_availability === AgentsOnlineStatus.OFFLINE;
  if (noAgentsWereOnline) {
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
    if (localMessage.ui_state.wasAgentChatEnded) {
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
    <Tile className="WACConnectToAgent">
      <div className="WACConnectToAgent__Title">
        <span>{languagePack.agent_chatTitle}</span>
      </div>
      <div className="WACConnectToAgent__Text">{messageToUser}</div>
      <Button
        className="WACConnectToAgent__RequestButton"
        size="md"
        disabled={showDisabled}
        onClick={doStartChat}
      >
        <ButtonIcon slot="icon" />
        {buttonText}
      </Button>
      {!showDisabled && isSuspended && (
        <div className="WACConnectToAgent__SuspendedWarning">
          {languagePack.agent_suspendedWarning}
        </div>
      )}
      {showConfirmSuspended && (
        <EndAgentChatModal
          title={languagePack.agent_confirmSuspendedEndChatTitle}
          message={languagePack.agent_confirmSuspendedEndChatMessage}
          onConfirm={doStartChat}
          onCancel={() => setShowConfirmSuspended(false)}
        />
      )}
    </Tile>
  );
}

export { RealConnectToAgent };
