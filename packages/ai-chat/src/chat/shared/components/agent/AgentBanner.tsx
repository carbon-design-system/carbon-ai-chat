/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import ScreenOff16 from "@carbon/icons/es/screen--off/16.js";
import { carbonIconToReact } from "../../utils/carbonIcon";
import Button, { BUTTON_KIND } from "../../../react/carbon/Button";
import CDSButton from "@carbon/web-components/es-custom/components/button/button.js";
import cx from "classnames";
import React, {
  forwardRef,
  RefObject,
  useImperativeHandle,
  useRef,
} from "react";
import { shallowEqual, useSelector } from "react-redux";

import { useLanguagePack } from "../../hooks/useLanguagePack";
import { useServiceManager } from "../../hooks/useServiceManager";
import { selectAgentDisplayState } from "../../store/selectors";
import { AppState } from "../../../../types/state/AppState";
import { HasRequestFocus } from "../../../../types/utilities/HasRequestFocus";
import { doFocusRef } from "../../utils/domUtils";
import { AnnounceOnMountComponent } from "../util/AnnounceOnMountComponent";
import { AgentAvatar } from "./AgentAvatar";
import { AvailabilityMessage } from "./AvailabilityMessage";

const ScreenOff = carbonIconToReact(ScreenOff16);

interface AgentBannerProps {
  /**
   * The callback that is called when the user clicks the "end chat" or "cancel" button.
   */
  onButtonClick: () => void;
}

/**
 * This component is a banner that appears at the top of the screen when the user is connecting or connected to a
 * live agent. It will display a cancel button in the case where the user is waiting for an agent or an "end chat"
 * button for when the user is connected to an agent.
 */
function AgentBanner(props: AgentBannerProps, ref: RefObject<HasRequestFocus>) {
  const { onButtonClick } = props;
  const languagePack = useLanguagePack();
  const serviceManager = useServiceManager();
  const persistedAgentState = useSelector(
    (state: AppState) => state.persistedToBrowserStorage.chatState.agentState
  );
  const agentState = useSelector((state: AppState) => state.agentState);
  const { isConnecting, availability, isScreenSharing } = agentState;
  const displayState = useSelector(selectAgentDisplayState, shallowEqual);
  const { agentProfile } = persistedAgentState;
  const buttonRef = useRef<CDSButton>();

  let line1;
  let line2;
  let avatar;
  let buttonLabel;
  let animation;

  if (isConnecting) {
    animation = <div className="WACLoadingBar__ConnectingAnimation" />;
    line1 = languagePack.agent_connecting;
    line2 = (
      <AnnounceOnMountComponent announceOnce={languagePack.agent_connecting}>
        <AvailabilityMessage
          availability={availability}
          fallbackText={languagePack.agent_connectWaiting}
        />
      </AnnounceOnMountComponent>
    );
    buttonLabel = languagePack.agent_connectButtonCancel;
  } else {
    line1 = agentProfile?.nickname || languagePack.agent_noName;
    buttonLabel = languagePack.agent_connectedButtonEndChat;
    avatar = (
      <AgentAvatar
        agentProfile={agentProfile}
        languagePack={languagePack}
        width="32px"
        height="32px"
      />
    );
  }

  const onStopSharing = () => {
    serviceManager.humanAgentService.screenShareStop();
  };

  // Add a "requestFocus" imperative function to the ref so other components can trigger focus here.
  useImperativeHandle(ref, () => ({
    requestFocus: () => {
      if (buttonRef.current) {
        doFocusRef(buttonRef);
        return true;
      }
      return false;
    },
  }));

  return (
    <div
      className={cx("WACAgentBanner", {
        "WACAgentBanner--connected": !isConnecting,
      })}
    >
      {displayState.isConnectingOrConnected && (
        <div className="WACAgentBanner__Body">
          {avatar}
          <div className="WACAgentBanner__AgentInfo">
            <div className="WACAgentBanner__AgentLine1">{line1}</div>
            {line2 && <div className="WACAgentBanner__AgentLine2">{line2}</div>}
          </div>
          <Button
            ref={buttonRef}
            className="WACAgentBanner__Button WACAgentBanner__CancelButton"
            onClick={onButtonClick}
            size="sm"
          >
            {buttonLabel}
          </Button>
        </div>
      )}
      {isScreenSharing && (
        <Button
          className="WACAgentBanner__Button WACAgentBanner__StopSharingButton"
          kind={"danger" as BUTTON_KIND}
          size="sm"
          onClick={onStopSharing}
        >
          <ScreenOff slot="icon" />
          {languagePack.agent_sharingStopSharingButton}
        </Button>
      )}

      {animation}
    </div>
  );
}

const AgentBannerExport = React.memo(forwardRef(AgentBanner));
export { AgentBannerExport as AgentBanner };
