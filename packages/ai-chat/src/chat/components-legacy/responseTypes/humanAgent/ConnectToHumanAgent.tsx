/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

import { HasServiceManager } from "../../../hocs/withServiceManager";
import { AppState } from "../../../../types/state/AppState";
import { HasRequestFocus } from "../../../../types/utilities/HasRequestFocus";
import { LocalMessageItem } from "../../../../types/messaging/LocalMessageItem";
import { useSelector } from "../../../hooks/useSelector";
import { shallowEqual } from "../../../store/appStore";
import { selectHumanAgentDisplayState } from "../../../store/selectors";
import { RealConnectToHumanAgent } from "./RealConnectToHumanAgent";
import {
  ConnectToHumanAgentItem,
  MessageResponse,
} from "../../../../types/messaging/Messages";

interface ConnectToHumanAgentProps extends HasServiceManager, HasRequestFocus {
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
    localMessage,
    originalMessage,
    serviceManager,
    disableUserInputs,
    requestFocus,
  } = props;

  // Subscribe to the agent slices here rather than in MessageTypeComponent: this
  // component only mounts for connect-to-agent messages, so ordinary messages no
  // longer re-render when human-agent state changes (typing indicators, unread
  // counts). `shallowEqual` keeps a new slice reference with unchanged fields
  // from re-rendering.
  const agentDisplayState = useSelector(
    selectHumanAgentDisplayState,
    shallowEqual,
  );
  const humanAgentState = useSelector(
    (state: AppState) => state.humanAgentState,
    shallowEqual,
  );
  const persistedHumanAgentState = useSelector(
    (state: AppState) => state.persistedToBrowserStorage.humanAgentState,
    shallowEqual,
  );

  const hasServiceDesk = useSelector((state: AppState) =>
    Boolean(state.config.public.serviceDeskFactory),
  );

  // Disable the "start chat" button if the widget is in a readonly mode or a preview mode with no service desk.
  const childDisableUserInputs = disableUserInputs || !hasServiceDesk;

  // The Carbon InlineNotification component doesn't allow HTML anymore, so faking it here.
  return (
    <div>
      <RealConnectToHumanAgent
        localMessage={localMessage}
        originalMessage={originalMessage}
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
