/*
 *  Copyright IBM Corp. 2025, 2026
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
import { useSelector } from "../../hooks/useSelector";

interface HydrationPanelProps {
  isHydrated: boolean;
}

const HydrationPanel: React.FC<HydrationPanelProps> = ({ isHydrated }) => {
  // Select only the one string this panel renders, so it never re-renders for an
  // unrelated language-pack change.
  const ariaWindowLoading = useSelector(
    (state: AppState) => state.languagePack.window_ariaWindowLoading,
  );
  return (
    <div className="cds-aichat--hydrating-container">
      <div className="cds-aichat--hydrating cds-aichat--panel-content">
        <MountChildrenOnDelay delay={400}>
          {!isHydrated && (
            <AnnounceOnMountComponent announceOnce={ariaWindowLoading} />
          )}
          <Loading active overlay={false} assistiveText={ariaWindowLoading} />
        </MountChildrenOnDelay>
      </div>
    </div>
  );
};

export default HydrationPanel;
