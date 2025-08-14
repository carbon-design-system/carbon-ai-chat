/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import ArrowRight from "@carbon/icons-react/es/ArrowRight.js";
import Restart from "@carbon/icons-react/es/Restart.js";
import { Button } from "@carbon/react";
import Tile from "../../../../react/carbon/Tile";
import React from "react";
import { useSelector } from "react-redux";

import { HasServiceManager } from "../../../hocs/withServiceManager";
import { useLanguagePack } from "../../../hooks/useLanguagePack";
import { AppState, ViewType } from "../../../../../types/state/AppState";
import { LocalMessageItem } from "../../../../../types/messaging/LocalMessageItem";
import {
  MainWindowCloseReason,
  TourStartReason,
} from "../../../../../types/events/eventBusTypes";

interface TourCardProps extends HasServiceManager {
  /**
   * The message that generated this card.
   */
  message: LocalMessageItem;
}

/**
 * When a message is received that has info for a tour then a tour card is shown to allow the user to start the tour. Once
 * the tour is started the tour card then changes to have a resume and restart button instead of a start button.
 */
function TourCard({ message, serviceManager }: TourCardProps) {
  const { tour_resumeButton, tour_restartButton, tour_startButton } =
    useLanguagePack();
  const { activeTourID } = useSelector(
    (state: AppState) =>
      state.persistedToBrowserStorage.chatState.persistedTourState
  );

  // If the id of the original message that generated this card matches the active tour ID then we should show a resume
  // and restart button instead of a start button.
  const isCurrentTour = message.fullMessageID === activeTourID;

  // Use the provided title and description if there is one. If there isn't one fall back to the defaults.

  // TODO TOUR: I18N: These default values are being kept around for tours in beta. When we switch to our GA solution of
  // using a real tour card response type the defaults will either come from tooling or will need to be moved to our
  // en.json file in Carbon AI chat and translated.
  const tourTitle =
    (message.item.user_defined?.card_title as unknown as any) ||
    "Guided journey";
  const tourDescription =
    (message.item.user_defined?.card_description as unknown as any) ||
    "Follow along as the assistant guides you to where you want to be.";

  /**
   * When resume is clicked switch to the tour view.
   */
  async function onResumeClick() {
    // Try to open the tour.
    await serviceManager.actions.changeView(ViewType.TOUR, {
      mainWindowCloseReason: MainWindowCloseReason.TOUR_CARD_RESUMED_TOUR,
    });
  }

  /**
   * When restart is clicked switch to the tour view and then change to the first step in the tour.
   */
  async function onRestartClick() {
    // Try to open the tour.
    const newViewState = await serviceManager.actions.changeView(
      ViewType.TOUR,
      {
        mainWindowCloseReason: MainWindowCloseReason.TOUR_CARD_RESTARTED_TOUR,
      }
    );

    if (newViewState.tour) {
      // If the tour is now visible then change to the first step in the tour.
      serviceManager.actions.changeStepInTour({ newStepIndex: 0 });
    }
  }

  return (
    <Tile className="WACTourCard">
      <div className="WACTourCard__Title">{tourTitle}</div>
      <div className="WACTourCard__Description">{tourDescription}</div>
      {isCurrentTour && (
        <div>
          <Button
            className="WACTourCard__ResumeButton"
            renderIcon={ArrowRight}
            onClick={onResumeClick}
          >
            {tour_resumeButton}
          </Button>
          <Button
            className="WACTourCard__RestartButton"
            kind="ghost"
            renderIcon={Restart}
            onClick={onRestartClick}
          >
            {tour_restartButton}
          </Button>
        </div>
      )}
      {!isCurrentTour && (
        <Button
          className="WACTourCard__StartButton"
          renderIcon={ArrowRight}
          onClick={() =>
            serviceManager.actions.startTour(
              message,
              TourStartReason.START_TOUR_CLICKED,
              {
                mainWindowCloseReason:
                  MainWindowCloseReason.TOUR_CARD_STARTED_TOUR,
              }
            )
          }
        >
          {tour_startButton}
        </Button>
      )}
    </Tile>
  );
}

const TourCardExport = React.memo(TourCard);
export { TourCardExport as TourCard };
