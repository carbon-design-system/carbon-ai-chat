/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import Checkmark16 from '@carbon/icons/es/checkmark/16.js';
import Headset16 from '@carbon/icons/es/headset/16.js';
import HelpDesk16 from '@carbon/icons/es/help-desk/16.js';
import Logout16 from '@carbon/icons/es/logout/16.js';
import { carbonIconToReact } from '../../../utils/carbonIcon';
import Card from '@carbon/ai-chat-components/es/react/card.js';
import Button from '../../../components/carbon/Button';
import React, { ReactNode, useEffect, useRef, useState } from 'react';

import { HasServiceManager } from '../../../hocs/withServiceManager';
import { HumanAgentsOnlineStatus } from '../../../../sdk/services/haa/HumanAgentService';
import {
  AppState,
  HumanAgentDisplayState,
} from '../../../../types/state/AppState';
import { useSelector } from '../../../hooks/useSelector';
import { shallowEqual } from '../../../../sdk/store/appStore';
import type { PublicChatHumanAgentState } from '../../../../types/instance/ChatSDKState';
import { HasRequestFocus } from '../../../../types/utilities/HasRequestFocus';
import { LocalMessageItem } from '../../../../types/messaging/LocalMessageItem';
import { AvailabilityMessage } from '../../humanAgent/AvailabilityMessage';
import {
  ConnectToHumanAgentItem,
  MessageResponse,
} from '../../../../types/messaging/Messages';
import { useChatMountStateInstance } from '../../../hooks/useChatMountState';
import { chatStore } from '../../../services/attachChatView';
import { openPrompt } from '../../../state';

const Checkmark = carbonIconToReact(Checkmark16);
const Headset = carbonIconToReact(Headset16);
const HelpDesk = carbonIconToReact(HelpDesk16);
const Logout = carbonIconToReact(Logout16);
interface RealConnectToHumanAgentProps
  extends HasServiceManager, HasRequestFocus {
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
   * The ID of the connect card whose start is connecting, if any.
   */
  activeLocalMessageID?: string;

  /**
   * Whether agents were online when the chat got this card, from the card's entry in
   * `instance.state.messageItems`. `null` means the chat checked and got no answer.
   */
  onlineStatus?: HumanAgentsOnlineStatus | null;

  /**
   * The agent state, as public state publishes it.
   */
  humanAgent: PublicChatHumanAgentState;

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
const selectRealConnectStrings = (state: AppState) => ({
  agent_cardButtonChatEnded: state.languagePack.agent_cardButtonChatEnded,
  agent_cardButtonChatRequested:
    state.languagePack.agent_cardButtonChatRequested,
  agent_cardButtonConnected: state.languagePack.agent_cardButtonConnected,
  agent_cardMessageChatEnded: state.languagePack.agent_cardMessageChatEnded,
  agent_cardMessageConnected: state.languagePack.agent_cardMessageConnected,
  agent_chatTitle: state.languagePack.agent_chatTitle,
  agent_confirmSuspendedEndChatMessage:
    state.languagePack.agent_confirmSuspendedEndChatMessage,
  agent_confirmSuspendedEndChatTitle:
    state.languagePack.agent_confirmSuspendedEndChatTitle,
  agent_connectWaiting: state.languagePack.agent_connectWaiting,
  agent_startChat: state.languagePack.agent_startChat,
  agent_suspendedWarning: state.languagePack.agent_suspendedWarning,
  default_agent_availableMessage:
    state.languagePack.default_agent_availableMessage,
  default_agent_unavailableMessage:
    state.languagePack.default_agent_unavailableMessage,
});

function RealConnectToHumanAgent(props: RealConnectToHumanAgentProps) {
  const languagePack = useSelector(selectRealConnectStrings, shallowEqual);
  const {
    localMessage,
    originalMessage,
    disableUserInputs,
    serviceManager,
    activeLocalMessageID,
    onlineStatus,
    requestFocus,
    agentDisplayState,
    humanAgent,
  } = props;
  const { availability, isConnecting, isSuspended } = humanAgent;

  const [showConfirmSuspended, setShowConfirmSuspended] = useState(false);
  const mountState = useChatMountStateInstance();
  // The prompt can outlive this card when a reuse remount keeps the chat, so
  // its answers reach the card's state and focus only while it's mounted.
  const cardMounted = useRef(false);
  useEffect(() => {
    cardMounted.current = true;
    return () => {
      cardMounted.current = false;
    };
  }, []);
  const focusCard = useRef<(() => void) | null>(null);
  useEffect(() => {
    focusCard.current = requestFocus;
    return () => {
      focusCard.current = null;
    };
  }, [requestFocus]);

  useEffect(() => {
    if (!showConfirmSuspended || !isSuspended) {
      return undefined;
    }
    const release = openPrompt(
      chatStore(serviceManager),
      {
        kind: 'humanAgent',
        title: languagePack.agent_confirmSuspendedEndChatTitle,
        message: languagePack.agent_confirmSuspendedEndChatMessage,
      },
      {
        onConfirm: () => {
          if (cardMounted.current) {
            setShowConfirmSuspended(false);
          }
          serviceManager.humanAgentService.startChat(
            localMessage,
            originalMessage
          );
          // Focus the card's button once it renders. With the card gone after
          // a remount, focus the chat instead, so focus isn't lost.
          setTimeout(() => {
            if (focusCard.current) {
              focusCard.current();
            } else {
              serviceManager.view?.current?.instance.requestFocus();
            }
          });
        },
        onCancel: () => {
          if (cardMounted.current) {
            setShowConfirmSuspended(false);
          }
        },
      }
    );
    return () => {
      // When the mount detaches, the prompt stays open for the next mount of
      // a reused chat; any other cleanup closes it. A React host unmounts the
      // card before the container detaches its mount, in a microtask queued
      // when the element left the page, so check after that microtask runs.
      queueMicrotask(() => {
        if (!mountState.detached) {
          release();
        }
      });
    };
  }, [
    showConfirmSuspended,
    isSuspended,
    languagePack,
    serviceManager,
    localMessage,
    originalMessage,
    mountState,
  ]);

  if (!isSuspended && showConfirmSuspended) {
    // This can happen if the user is disconnected while waiting for the confirmation.
    setShowConfirmSuspended(false);
  }

  function doStartChat() {
    if (isSuspended && !showConfirmSuspended) {
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
    onlineStatus === HumanAgentsOnlineStatus.OFFLINE;
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

  let ButtonIcon: (props: any) => ReactNode | Promise<ReactNode>; // CarbonIconType is not exported, currently.
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
    <Card isFlush className="cds-aichat--connect-to-human-agent">
      <div
        slot="body"
        className="cds-aichat--body-message-components__message-wrapper">
        <div className="cds-aichat--connect-to-human-agent__title">
          <span>{languagePack.agent_chatTitle}</span>
        </div>
        <div className="cds-aichat--connect-to-human-agent__text">
          {messageToUser}
        </div>
        {!showDisabled && isSuspended && (
          <div className="cds-aichat--connect-to-human-agent__suspended-warning">
            {languagePack.agent_suspendedWarning}
          </div>
        )}
      </div>
      <div slot="footer" className="cds-aichat--footer-button-components">
        <Button
          className="cds-aichat--connect-to-human-agent__request-button cds-aichat--button-item"
          size="md"
          disabled={showDisabled}
          onClick={doStartChat}>
          <ButtonIcon slot="icon" />
          {buttonText}
        </Button>
      </div>
    </Card>
  );
}

export { RealConnectToHumanAgent };
