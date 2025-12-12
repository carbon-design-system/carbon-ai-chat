/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cx from "classnames";
import React, { useContext } from "react";

import Loading from "../components/carbon/Loading";
import { OverlayPanel } from "../components-legacy/OverlayPanel";
import { AssistantHeader } from "../components-legacy/header/AssistantHeader";
import { HomeScreenHeader } from "../components-legacy/homeScreen/HomeScreenHeader";
import { AnnounceOnMountComponent } from "../components-legacy/util/AnnounceOnMountComponent";
import { MountChildrenOnDelay } from "../components-legacy/util/MountChildrenOnDelay";
import { HideComponentContext } from "../contexts/HideComponentContext";
import { HasServiceManager } from "../hocs/withServiceManager";
import {
  AnimationInType,
  AnimationOutType,
} from "../../types/utilities/Animation";
import { PageObjectId } from "../../testing/PageObjectId";
import type { AppState } from "../../types/state/AppState";

type LanguagePack = AppState["config"]["derived"]["languagePack"];

interface HydrationPanelProps extends HasServiceManager {
  headerDisplayName: string;
  shouldOpen: boolean;
  isHydrated: boolean;
  useHomeScreenVersion: boolean;
  languagePack: LanguagePack;
  onClose: () => void;
  onOpenStart: () => void;
  onCloseStart: () => void;
  onOpenEnd: () => void;
  onCloseEnd: () => void;
}

const HydrationPanel: React.FC<HydrationPanelProps> = ({
  headerDisplayName,
  shouldOpen,
  isHydrated,
  useHomeScreenVersion,
  languagePack,
  serviceManager,
  onClose,
  onOpenStart,
  onCloseStart,
  onOpenEnd,
  onCloseEnd,
}) => {
  const isHidden = useContext(HideComponentContext);
  const header = useHomeScreenVersion ? (
    <HomeScreenHeader onClose={onClose} />
  ) : (
    <AssistantHeader
      onClose={onClose}
      headerDisplayName={headerDisplayName}
      onToggleHomeScreen={null}
      includeWriteableElement={false}
    />
  );

  return (
    <OverlayPanel
      onOpenStart={onOpenStart}
      onCloseStart={onCloseStart}
      onOpenEnd={onOpenEnd}
      onCloseEnd={onCloseEnd}
      animationOnOpen={AnimationInType.NONE}
      animationOnClose={AnimationOutType.NONE}
      shouldOpen={shouldOpen}
      serviceManager={serviceManager}
      overlayPanelName={PageObjectId.HYDRATING_PANEL}
    >
      <div className="cds-aichat-- cds-aichat--hydrating-container">
        {header}
        <div
          className={cx("cds-aichat--hydrating", "cds-aichat--panel-content", {
            "cds-aichat--hydrating--home-screen": useHomeScreenVersion,
          })}
        >
          {!isHidden && (
            <MountChildrenOnDelay delay={400}>
              {!isHydrated && (
                <AnnounceOnMountComponent
                  announceOnce={languagePack.window_ariaWindowLoading}
                />
              )}
              <Loading
                active
                overlay={false}
                assistiveText={languagePack.window_ariaWindowLoading}
              />
            </MountChildrenOnDelay>
          )}
        </div>
      </div>
    </OverlayPanel>
  );
};

export default HydrationPanel;
