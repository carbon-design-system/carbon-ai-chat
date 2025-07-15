/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { Loading } from "@carbon/react";
import cx from "classnames";
import React, { useContext } from "react";

import { HideComponentContext } from "../contexts/HideComponentContext";
import { HasServiceManager } from "../hocs/withServiceManager";
import HasLanguagePack from "../../../types/utilities/HasLanguagePack";
import { BotHeader } from "./header/BotHeader";
import { HomeScreenHeader } from "./homeScreen/HomeScreenHeader";
import { AnnounceOnMountComponent } from "./util/AnnounceOnMountComponent";
import { MountChildrenOnDelay } from "./util/MountChildrenOnDelay";

interface HydrationPanelProps extends HasServiceManager, HasLanguagePack {
  /**
   * Indicates if the Carbon AI chat has been hydrated.
   */
  isHydrated: boolean;

  /**
   * Indicates if we should show a home screen version. This minimizes a jarring shift when Carbon AI chat initially opens
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
 * This component is rendered while the Carbon AI chat is hydrating.
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
      />
    );
  }

  return (
    <div className="WAC WAC__hydratingContainer">
      {header}
      <div
        className={cx("WAC__hydrating", "WACPanelContent", {
          "WAC__hydrating--homeScreen": useHomeScreenVersion,
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
              withOverlay={false}
              aria-label={languagePack.window_ariaWindowLoading}
            />
          </MountChildrenOnDelay>
        )}
      </div>
    </div>
  );
}

export { HydrationPanel };
