/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";
import type CDSButton from "@carbon/web-components/es/components/button/button.js";

import Disclaimer from "../components-legacy/Disclaimer";
import { OverlayPanel } from "../components-legacy/OverlayPanel";
import { HasServiceManager } from "../hocs/withServiceManager";
import {
  AnimationInType,
  AnimationOutType,
} from "../../types/utilities/Animation";
import { PageObjectId } from "../../testing/PageObjectId";

interface DisclaimerPanelProps extends HasServiceManager {
  shouldOpen: boolean;
  disclaimerHTML?: string;
  disclaimerAcceptButtonRef: React.RefObject<CDSButton | null>;
  onAcceptDisclaimer: () => void;
  onClose: () => void;
  onOpenStart: () => void;
  onCloseStart: () => void;
  onOpenEnd: () => void;
  onCloseEnd: () => void;
}

const DisclaimerPanel: React.FC<DisclaimerPanelProps> = ({
  serviceManager,
  shouldOpen,
  disclaimerHTML,
  disclaimerAcceptButtonRef,
  onAcceptDisclaimer,
  onClose,
  onOpenStart,
  onCloseStart,
  onOpenEnd,
  onCloseEnd,
}) => (
  <OverlayPanel
    onOpenStart={onOpenStart}
    onCloseStart={onCloseStart}
    onOpenEnd={onOpenEnd}
    onCloseEnd={onCloseEnd}
    animationOnOpen={AnimationInType.FADE_IN}
    animationOnClose={AnimationOutType.FADE_OUT}
    shouldOpen={shouldOpen}
    serviceManager={serviceManager}
    overlayPanelName={PageObjectId.DISCLAIMER_PANEL}
  >
    <Disclaimer
      onAcceptDisclaimer={onAcceptDisclaimer}
      onClose={onClose}
      disclaimerHTML={disclaimerHTML}
      disclaimerAcceptButtonRef={disclaimerAcceptButtonRef}
    />
  </OverlayPanel>
);

export default DisclaimerPanel;
