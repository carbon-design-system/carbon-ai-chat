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
import Button, { BUTTON_KIND } from "../../components/carbon/Button";
import CDSButton from "@carbon/web-components/es/components/button/button.js";
import cx from "classnames";
import React, {
  forwardRef,
  RefObject,
  useImperativeHandle,
  useRef,
} from "react";
import { useSelector } from "../../hooks/useSelector";
import { shallowEqual } from "../../store/appStore";

import { useLanguagePack } from "../../hooks/useLanguagePack";
import { useServiceManager } from "../../hooks/useServiceManager";
import { selectHumanAgentDisplayState } from "../../store/selectors";
import { AppState } from "../../../types/state/AppState";
import { HasRequestFocus } from "../../../types/utilities/HasRequestFocus";
import { doFocusRef } from "../../utils/domUtils";
import { AnnounceOnMountComponent } from "../util/AnnounceOnMountComponent";
import { ResponseUserAvatar } from "../ResponseUserAvatar";
import { AvailabilityMessage } from "./AvailabilityMessage";

const ScreenOff = carbonIconToReact(ScreenOff16);

interface HumanAgentBannerProps {
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
function HumanAgentBanner(
  props: HumanAgentBannerProps,
  ref: RefObject<HasRequestFocus>,
) {
  const { onButtonClick } = props;
  const languagePack = useLanguagePack();
  const serviceManager = useServiceManager();
  const persistedHumanAgentState = useSelector(
    (state: AppState) => state.persistedToBrowserStorage.humanAgentState,
  );
  const humanAgentState = useSelector(
    (state: AppState) => state.humanAgentState,
  );
  const { isConnecting, availability, isScreenSharing } = humanAgentState;
  const displayState = useSelector(selectHumanAgentDisplayState, shallowEqual);
  const { responseUserProfile } = persistedHumanAgentState;
  const buttonRef = useRef<CDSButton>();

  let line1;
  let line2;
  let avatar;
  let buttonLabel;
  let animation;

  if (isConnecting) {
    animation = (
      <div className="cds-aichat--loading-bar__connecting-animation" />
    );
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
    line1 = responseUserProfile?.nickname || languagePack.agent_noName;
    buttonLabel = languagePack.agent_connectedButtonEndChat;
    avatar = (
      <ResponseUserAvatar
        responseUserProfile={responseUserProfile}
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
      className={cx("cds-aichat--human-agent-banner", {
        "cds-aichat--human-agent-banner--connected": !isConnecting,
      })}
    >
      {displayState.isConnectingOrConnected && (
        <div className="cds-aichat--human-agent-banner__body">
          {avatar}
          <div className="cds-aichat--human-agent-banner__human-agent-info">
            <div className="cds-aichat--human-agent-banner__human-agent-line1">
              {line1}
            </div>
            {line2 && (
              <div className="cds-aichat--human-agent-banner__human-agent-line2">
                {line2}
              </div>
            )}
          </div>
          <Button
            ref={buttonRef}
            className="cds-aichat--human-agent-banner__button cds-aichat--human-agent-banner__cancel-button"
            onClick={onButtonClick}
            size="sm"
          >
            {buttonLabel}
          </Button>
        </div>
      )}
      {isScreenSharing && (
        <Button
          className="cds-aichat--human-agent-banner__button cds-aichat--human-agent-banner__stop-sharing-button"
          kind={BUTTON_KIND.DANGER}
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

const HumanAgentBannerExport = React.memo(forwardRef(HumanAgentBanner));
export { HumanAgentBannerExport as HumanAgentBanner };
