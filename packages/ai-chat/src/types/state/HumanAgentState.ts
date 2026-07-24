/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { AgentAvailability } from "../config/ServiceDeskConfig";
import { LanguagePack } from "../config/LanguagePack";
import { InputState } from "./InputState";

/**
 * This piece of state contains information about any connection to a human agent system.
 */
interface HumanAgentState {
  /**
   * Indicates that we are currently attempting to connect the user to an agent.
   */
  isConnecting: boolean;

  /**
   * Indicates that we are currently attempting to re-connect the user to an agent. This occurs when Carbon AI Chat is
   * initially loaded and the user was previously connected to an agent.
   */
  isReconnecting: boolean;

  /**
   * Information about the waiting status for the user before being connected to an agent. This can contain
   * information about the time to wait or the position in a queue. If this is null, no specific wait information is
   * available.
   */
  availability?: AgentAvailability;

  /**
   * Indicates the number of messages from an agent that are unread by a user. This is only indicated if the user is
   * on the assistant view. All agent messages are marked as read if the user switches to the agent view. This count does
   * not include "agent joined" messages.
   */
  numUnreadMessages: number;

  /**
   * Indicates if there is currently a file upload in progress.
   */
  fileUploadInProgress: boolean;

  /**
   * The ID of the locale message that was used to start the current conversation with an agent.
   */
  activeLocalMessageID?: string;

  /**
   * Indicates if the modal for displaying a screen sharing requests should be shown.
   */
  showScreenShareRequest: boolean;

  /**
   * Indicates if the user is currently sharing their screen.
   */
  isScreenSharing: boolean;

  /**
   * Indicates if the agent is typing.
   */
  isHumanAgentTyping: boolean;

  /**
   * The state of the input field while connecting or connected to an agent.
   */
  inputState: InputState;
}

/**
 * The state that controls how the agent interaction appears to the user.
 */
interface HumanAgentDisplayState {
  /**
   * Indicates if the user should see that they are connecting or connected to an agent.
   */
  isConnectingOrConnected: boolean;

  /**
   * Indicates if the input field should be disabled.
   */
  disableInput: boolean;

  /**
   * The language pack key to show for the placeholder text in the input field (if the default should be overridden).
   */
  inputPlaceholderKey: keyof LanguagePack;

  /**
   * Indicates if the agent is typing.
   */
  isHumanAgentTyping: boolean;
}

export type { HumanAgentState, HumanAgentDisplayState };
