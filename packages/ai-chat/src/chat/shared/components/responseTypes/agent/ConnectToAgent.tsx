/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

import { HasServiceManager } from "../../../hocs/withServiceManager";
import { AppConfig } from "../../../../../types/state/AppConfig";
import {
  AgentDisplayState,
  AgentState,
} from "../../../../../types/state/AppState";
import HasLanguagePack from "../../../../../types/utilities/HasLanguagePack";
import { HasRequestFocus } from "../../../../../types/utilities/HasRequestFocus";
import { LocalMessageItem } from "../../../../../types/messaging/LocalMessageItem";
import { PersistedAgentState } from "../../../../../types/state/PersistedAgentState";
import { hasServiceDesk } from "../../../utils/messageUtils";
import { RealConnectToAgent } from "./RealConnectToAgent";
import {
  ConnectToAgentItem,
  MessageResponse,
} from "../../../../../types/messaging/Messages";

interface ConnectToAgentProps
  extends HasLanguagePack,
    HasServiceManager,
    HasRequestFocus {
  /**
   * The message that triggered this connect-to-agent action.
   */
  localMessage: LocalMessageItem<ConnectToAgentItem>;

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
  agentState: AgentState;

  /**
   * The current persisted agent state.
   */
  persistedAgentState: PersistedAgentState;

  /**
   * The current application agent state.
   */
  agentDisplayState: AgentDisplayState;

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
function ConnectToAgent(props: ConnectToAgentProps) {
  const {
    languagePack,
    localMessage,
    originalMessage,
    config,
    serviceManager,
    disableUserInputs,
    agentState,
    requestFocus,
    agentDisplayState,
    persistedAgentState,
  } = props;

  // Disable the "start chat" button if the widget is in a readonly mode or a preview mode with no service desk.
  const childDisableUserInputs = disableUserInputs || !hasServiceDesk(config);

  // The Carbon InlineNotification component doesn't allow HTML anymore, so faking it here.
  return (
    <div>
      <RealConnectToAgent
        localMessage={localMessage}
        originalMessage={originalMessage}
        languagePack={languagePack}
        serviceManager={serviceManager}
        disableUserInputs={childDisableUserInputs}
        agentState={agentState}
        persistedAgentState={persistedAgentState}
        agentDisplayState={agentDisplayState}
        requestFocus={requestFocus}
      />
    </div>
  );
}

export { ConnectToAgent };
