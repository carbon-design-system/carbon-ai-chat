/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

import { CustomPanel } from "../components-legacy/panels/CustomPanel";
import type { HasRequestFocus } from "../../types/utilities/HasRequestFocus";

interface CustomPanelContainerProps {
  panelRef: React.RefObject<HasRequestFocus | null>;
  onClose: () => void;
  onClickRestart: () => void;
  onPanelOpenStart: () => void;
  onPanelOpenEnd: () => void;
  onPanelCloseStart: () => void;
  onPanelCloseEnd: () => void;
}

const CustomPanelContainer: React.FC<CustomPanelContainerProps> = ({
  panelRef,
  onClose,
  onClickRestart,
  onPanelOpenStart,
  onPanelOpenEnd,
  onPanelCloseStart,
  onPanelCloseEnd,
}) => (
  <CustomPanel
    ref={panelRef}
    onClose={onClose}
    onClickRestart={onClickRestart}
    onPanelOpenStart={onPanelOpenStart}
    onPanelOpenEnd={onPanelOpenEnd}
    onPanelCloseStart={onPanelCloseStart}
    onPanelCloseEnd={onPanelCloseEnd}
  />
);

export default CustomPanelContainer;
