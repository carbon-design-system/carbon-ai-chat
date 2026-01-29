/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

import Loading from "../carbon/Loading";
import { AnnounceOnMountComponent } from "../util/AnnounceOnMountComponent";
import { MountChildrenOnDelay } from "../util/MountChildrenOnDelay";
import type { AppState } from "../../../types/state/AppState";

type LanguagePack = AppState["config"]["derived"]["languagePack"];

interface HydrationPanelProps {
  isHydrated: boolean;
  languagePack: LanguagePack;
}

const HydrationPanel: React.FC<HydrationPanelProps> = ({
  isHydrated,
  languagePack,
}) => {
  return (
    <div className="cds-aichat--hydrating-container">
      <div className="cds-aichat--hydrating cds-aichat--panel-content">
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
      </div>
    </div>
  );
};

export default HydrationPanel;
