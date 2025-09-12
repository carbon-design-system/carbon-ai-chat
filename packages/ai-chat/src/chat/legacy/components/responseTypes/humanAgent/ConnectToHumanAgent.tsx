/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

import { HasServiceManager } from "../../../../hocs/withServiceManager";
import { AppConfig } from "../../../../../types/state/AppConfig";
import {
  HumanAgentDisplayState,
  HumanAgentState,
} from "../../../../../types/state/AppState";
import { PersistedHumanAgentState } from "../../../../../types/state/PersistedHumanAgentState";
import HasLanguagePack from "../../../../../types/utilities/HasLanguagePack";
import { HasRequestFocus } from "../../../../../types/utilities/HasRequestFocus";
import { LocalMessageItem } from "../../../../../types/messaging/LocalMessageItem";
import { hasServiceDesk } from "../../../../utils/messageUtils";
import { RealConnectToHumanAgent } from "./RealConnectToHumanAgent";
import {
  ConnectToHumanAgentItem,
  MessageResponse,
} from "../../../../../types/messaging/Messages";

interface ConnectToHumanAgentProps
  extends HasLanguagePack,
    HasServiceManager,
    HasRequestFocus {
  /**
   * The message that triggered this connect-to-agent action.
   */
  localMessage: LocalMessageItem<ConnectToHumanAgentItem>;

  /**
   * The message that triggered this connect-to-agent action.
   */
  originalMessage: MessageResponse;

  /**
   * Indicates if the "start chat" button should be disabled.
   */
  disableUserInputs: boolean;

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

  /**
   * The configuration for the widget.
   */
  config: AppConfig;
}

/**
 * This component is displayed to the user when a "connect to agent" response comes back from the server. This
 * informs the user that we are able to connect them to a human agent and displays a confirmation asking if they do
 * want to connect.
 *
 * This component will display the appropriate panel depending on whether the user is viewing the preview link.
 */
function ConnectToHumanAgent(props: ConnectToHumanAgentProps) {
  const {
    languagePack,
    localMessage,
    originalMessage,
    config,
    serviceManager,
    disableUserInputs,
    humanAgentState,
    requestFocus,
    agentDisplayState,
    persistedHumanAgentState,
  } = props;

  // Disable the "start chat" button if the widget is in a readonly mode or a preview mode with no service desk.
  const childDisableUserInputs = disableUserInputs || !hasServiceDesk(config);

  // The Carbon InlineNotification component doesn't allow HTML anymore, so faking it here.
  return (
    <div>
      <RealConnectToHumanAgent
        localMessage={localMessage}
        originalMessage={originalMessage}
        languagePack={languagePack}
        serviceManager={serviceManager}
        disableUserInputs={childDisableUserInputs}
        humanAgentState={humanAgentState}
        persistedHumanAgentState={persistedHumanAgentState}
        agentDisplayState={agentDisplayState}
        requestFocus={requestFocus}
      />
    </div>
  );
}

export { ConnectToHumanAgent };
