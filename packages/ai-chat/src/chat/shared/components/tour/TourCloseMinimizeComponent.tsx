/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import Close from "@carbon/icons-react/es/Close.js";
import Subtract from "@carbon/icons-react/es/Subtract.js";
import { Button } from "@carbon/react";
import React from "react";

import { useLanguagePack } from "../../hooks/useLanguagePack";

interface TourCloseMinimizeComponentProps {
  /**
   * Indicates if the minimize button should be hidden.
   */
  hideMinimizeButton: boolean;

  /**
   * When the tour is closed switch to the launcher. If the launcher is then clicked the main window will open.
   */
  onCloseClick: () => void;

  /**
   * When the tour is minimized switch to the launcher. If the launcher is then clicked the tour will reopen.
   */
  onMinimizeClick: () => void;
}

/**
 * This renders the close and minimize buttons for the tour feature.
 */
function TourCloseMinimizeComponent(props: TourCloseMinimizeComponentProps) {
  const { hideMinimizeButton, onMinimizeClick, onCloseClick } = props;
  const { tour_ariaMinimizeButton, tour_ariaCloseButton } = useLanguagePack();

  return (
    <div className="WACTour__CloseMinimizeWrapper">
      {!hideMinimizeButton && (
        <>
          <Button
            className="WACTour__CloseMinimizeButton WACTour__MinimizeButton"
            kind="ghost"
            hasIconOnly
            renderIcon={Subtract}
            iconDescription={tour_ariaMinimizeButton}
            onClick={onMinimizeClick}
            aria-label={tour_ariaMinimizeButton}
          />
          <div className="WACTour__CloseMinimizeDivider" />
        </>
      )}
      <Button
        className="WACTour__CloseMinimizeButton WACTour__CloseButton"
        kind="ghost"
        hasIconOnly
        renderIcon={Close}
        iconDescription={tour_ariaCloseButton}
        onClick={onCloseClick}
        aria-label={tour_ariaCloseButton}
      />
    </div>
  );
}

export { TourCloseMinimizeComponent };
