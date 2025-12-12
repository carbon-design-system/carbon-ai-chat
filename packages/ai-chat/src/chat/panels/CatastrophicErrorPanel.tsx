/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

import CatastrophicError from "../components-legacy/CatastrophicError";
import { OverlayPanel } from "../components-legacy/OverlayPanel";
import { HasServiceManager } from "../hocs/withServiceManager";
import {
  AnimationInType,
  AnimationOutType,
} from "../../types/utilities/Animation";
import { PageObjectId } from "../../testing/PageObjectId";
import type { AppState } from "../../types/state/AppState";

type LanguagePack = AppState["config"]["derived"]["languagePack"];

interface CatastrophicErrorPanelProps extends HasServiceManager {
  headerDisplayName: string;
  assistantName: string;
  languagePack: LanguagePack;
  onClose: () => void;
  onRestart: () => void;
}

const CatastrophicErrorPanel: React.FC<CatastrophicErrorPanelProps> = ({
  serviceManager,
  headerDisplayName,
  assistantName,
  languagePack,
  onClose,
  onRestart,
}) => (
  <OverlayPanel
    animationOnOpen={AnimationInType.NONE}
    animationOnClose={AnimationOutType.NONE}
    shouldOpen
    serviceManager={serviceManager}
    overlayPanelName={PageObjectId.CATASTROPHIC_PANEL}
  >
    <CatastrophicError
      onClose={onClose}
      headerDisplayName={headerDisplayName}
      languagePack={languagePack}
      onRestart={onRestart}
      showHeader
      assistantName={assistantName}
    />
  </OverlayPanel>
);

export default CatastrophicErrorPanel;
