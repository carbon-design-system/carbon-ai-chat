/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import Loading from "../components/carbon/Loading";
import cx from "classnames";
import React, { useContext } from "react";

import { HideComponentContext } from "../contexts/HideComponentContext";
import { HasServiceManager } from "../hocs/withServiceManager";
import HasLanguagePack from "../../types/utilities/HasLanguagePack";
import { BotHeader } from "./header/BotHeader";
import { HomeScreenHeader } from "./homeScreen/HomeScreenHeader";
import { AnnounceOnMountComponent } from "./util/AnnounceOnMountComponent";
import { MountChildrenOnDelay } from "./util/MountChildrenOnDelay";
import { OverlayPanelName } from "./OverlayPanel";

interface HydrationPanelProps extends HasServiceManager, HasLanguagePack {
  /**
   * Indicates if the Carbon AI Chat has been hydrated.
   */
  isHydrated: boolean;

  /**
   * Indicates if we should show a home screen version. This minimizes a jarring shift when Carbon AI Chat initially opens
   * and the home screen appears.
   */
  useHomeScreenVersion: boolean;

  /**
   * Method to call if close button is pressed.
   */
  onClose: () => void;

  /**
   * The name of the bot to display in the header.
   */
  headerDisplayName: string;
}

/**
 * This component is rendered while the Carbon AI Chat is hydrating.
 */

function HydrationPanel({
  onClose,
  languagePack,
  isHydrated,
  headerDisplayName,
  useHomeScreenVersion,
}: HydrationPanelProps) {
  // This panel gets hidden instead of unmounted by the overlay container. We want to unmount the loading spinner
  // below when that happens.
  const isHidden = useContext(HideComponentContext);

  let header;
  if (useHomeScreenVersion) {
    header = <HomeScreenHeader onClose={onClose} />;
  } else {
    header = (
      <BotHeader
        onClose={onClose}
        headerDisplayName={headerDisplayName}
        onToggleHomeScreen={null}
        includeWriteableElement={false}
        testIdPrefix={OverlayPanelName.HYDRATING}
      />
    );
  }

  return (
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
  );
}

export { HydrationPanel };
