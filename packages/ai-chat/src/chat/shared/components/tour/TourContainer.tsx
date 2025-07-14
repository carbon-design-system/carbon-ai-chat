/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import ErrorFilled from "@carbon/icons-react/es/ErrorFilled.js";
import Restart from "@carbon/icons-react/es/Restart.js";
import { Button, InlineNotification } from "@carbon/react";
import React, {
  ReactElement,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useIntl } from "react-intl";
import { useSelector } from "react-redux";

import {
  BusEventType,
  MainWindowOpenReason,
  TourEndReason,
  ViewChangeReason,
} from "../../../../types/events/eventBusTypes";
import { useAriaAnnouncer } from "../../hooks/useAriaAnnouncer";
import { useLanguagePack } from "../../hooks/useLanguagePack";
import { useServiceManager } from "../../hooks/useServiceManager";
import { AppState, ViewType } from "../../../../types/state/AppState";
import { HasRequestFocus } from "../../../../types/utilities/HasRequestFocus";
import { formatMessage } from "../../utils/languages";
import { AnnounceOnMountComponent } from "../util/AnnounceOnMountComponent";
import { HideComponent } from "../util/HideComponent";
import { MountChildrenOnDelay } from "../util/MountChildrenOnDelay";
import { TourCloseMinimizeComponent } from "./TourCloseMinimizeComponent";
import { TourControlsComponent } from "./TourControlsComponent";
import { TourStepContentComponent } from "./TourStepContentComponent";
import { TourStepSkeletonComponent } from "./TourStepSkeletonComponent";
import { EnglishLanguagePack } from "../../../../types/instance/apiTypes";

/**
 * This manages the tour feature controls and renders the tour content before passing both to either a mobile or desktop
 * container depending.
 */
function TourContainer(props: unknown, ref: React.Ref<HasRequestFocus>) {
  const languagePack = useLanguagePack();
  const serviceManager = useServiceManager();
  const ariaAnnouncer = useAriaAnnouncer();

  const intl = useIntl();
  const tourConfig = useSelector(
    (state: AppState) => state.config.public.tourConfig
  );
  const { isHydrated } = useSelector((state: AppState) => state);
  const { viewState } = useSelector(
    (state: AppState) => state.persistedToBrowserStorage.launcherState
  );
  const { activeTourCurrentStepIndex } = useSelector(
    (state: AppState) =>
      state.persistedToBrowserStorage.chatState.persistedTourState
  );
  const { activeTourStepItems } = useSelector(
    (state: AppState) => state.tourState
  );
  // These three state variables are for future use when dynamic steps are introduced.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [renderLoadingBar, setRenderLoadingBar] = useState(false);
  const [renderErrorBanner, setRenderErrorBanner] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [renderErrorScreen, setRenderErrorScreen] = useState(false);
  const rootRef = useRef<HTMLDivElement>();
  const tourControlsRef = useRef<HasRequestFocus>();
  const namespace = serviceManager.namespace.originalName;
  const languageKey: keyof EnglishLanguagePack = namespace
    ? "window_ariaTourRegionNamespace"
    : "window_ariaTourRegion";
  const regionLabel = formatMessage(intl, languageKey, { namespace });

  // If we're showing the launcher or main window then hide the tour. We do this instead of unmounting so that we don't
  // lose scroll position, video playback position, etc.
  const hideTour = !viewState.tour;

  // Set default values for the tour controls that match what we want to show during the loading state. These values
  // will be updated when the Carbon AI chat is hydrated and the activeTourStepItems become available.
  let reservePreviousButtonSpace = true;
  let hidePreviousButton = false;
  let renderDoneButton = false;
  let stepContentComponentsArray: Array<ReactElement> = [];

  // Once the Carbon AI chat is hydrated, and we have the activeTourStepItems, create TourStepContentComponent's for each step
  // and set the correct values for the tour controls properties.
  if (isHydrated && activeTourStepItems) {
    // If there is more than one step in the tour then save space in the tour controls for a previous button.
    // This doesn't guarantee that the previous button will be visible, just that there will be room for it in the
    // controls.
    reservePreviousButtonSpace = activeTourStepItems.length > 1;
    // If there has been space reserved for the previous button then hide it if this is the first step of the tour.
    // Any other step will show the previous button in the space reserved.
    hidePreviousButton = activeTourCurrentStepIndex <= 0;
    // If this is the last step of the tour then show a done button instead of a next button.
    renderDoneButton =
      activeTourCurrentStepIndex >= activeTourStepItems.length - 1;

    // For each step (GenericItem) in the array of steps, create a TourStepContentComponent, and return it. Assign this
    // new array of TourStepContentComponents to our local array.
    stepContentComponentsArray = activeTourStepItems.map((step, index) => (
      <TourStepContentComponent
        // eslint-disable-next-line react/no-array-index-key
        key={index}
        stepGenericItem={step}
        isCurrentStep={index === activeTourCurrentStepIndex}
      />
    ));
  } else if (!isHydrated) {
    // If the Carbon AI chat is not hydrated then show a skeleton component.
    stepContentComponentsArray = [<TourStepSkeletonComponent key={0} />];
  }

  /**
   * When the user clicks on the main window icon then fire the window open events and switch to the main window.
   */
  async function onOpenMainWindowClick() {
    // Try to open the main window.
    await serviceManager.actions.changeView(ViewType.MAIN_WINDOW, {
      mainWindowOpenReason: MainWindowOpenReason.TOUR_OPENED_OTHER_VIEW,
    });
  }

  /**
   * When the tour is finished switch to the launcher and clear the tour data. When the launcher is clicked the main
   * window will open.
   */
  async function onDoneClick() {
    // Fire the tour end event before switching to the launcher.
    await serviceManager.eventBus.fire(
      { type: BusEventType.TOUR_END, reason: TourEndReason.DONE_CLICKED },
      serviceManager.instance
    );
    // Try to open the launcher and clear the tour data from store.
    await serviceManager.actions.endTour({
      viewChangeReason: ViewChangeReason.TOUR_DONE,
    });
  }

  /**
   * When the tour is closed switch to the launcher and clear the tour data. When the launcher is clicked the main
   * window will open.
   */
  async function onCloseClick() {
    // Try to open the launcher and clear the tour data from store.
    await serviceManager.actions.endTour({
      viewChangeReason: ViewChangeReason.TOUR_CLOSED,
    });
  }

  /**
   * When the tour is minimized switch to the launcher. When the launcher is clicked the tour will open.
   */
  async function onMinimizeClick() {
    // Try to open the launcher.
    await serviceManager.actions.changeView(ViewType.LAUNCHER, {
      viewChangeReason: ViewChangeReason.TOUR_MINIMIZED,
    });
  }

  /**
   * Now that we have the necessary pieces render the controls for the tour feature.
   */
  function renderTourControlsComponent() {
    return (
      <TourControlsComponent
        ref={tourControlsRef}
        hideChatButton={tourConfig?.hideChatButton}
        reservePreviousButtonSpace={reservePreviousButtonSpace}
        hidePreviousButton={hidePreviousButton}
        disableNextButton={renderLoadingBar}
        hideButtons={!isHydrated}
        renderDoneButton={renderDoneButton}
        onNextClick={() => {
          serviceManager.actions.changeStepInTour({ nextStep: true });
          // If the next step is the final step, request focus so that the "done" button has focus.
          if (
            activeTourCurrentStepIndex + 1 ===
            activeTourStepItems.length - 1
          ) {
            tourControlsRef.current?.requestFocus();
          }
        }}
        onPreviousClick={() => {
          serviceManager.actions.changeStepInTour({ previousStep: true });
          // If the previous step is the first step, request focus so that the "next" button has focus.
          if (activeTourCurrentStepIndex - 1 === 0) {
            tourControlsRef.current?.requestFocus();
          }
        }}
        onOpenMainWindowClick={onOpenMainWindowClick}
        onDoneClick={onDoneClick}
      />
    );
  }

  function renderTourCloseMinimizeComponent() {
    return (
      <TourCloseMinimizeComponent
        hideMinimizeButton={tourConfig?.hideMinimizeButton}
        onCloseClick={onCloseClick}
        onMinimizeClick={onMinimizeClick}
      />
    );
  }

  /**
   * Handles rendering a loading bar or error notification based on the state of the active tour.
   */
  function renderTourStepStatusContainer() {
    return (
      <div className="WACTour__StatusContainer">
        {renderErrorBanner && (
          <AnnounceOnMountComponent>
            <InlineNotification
              kind="error"
              title={languagePack.tour_errorFetchingStep}
              lowContrast
              hideCloseButton
              onClick={() => setRenderErrorBanner(false)}
            />
          </AnnounceOnMountComponent>
        )}
        {renderLoadingBar && (
          <MountChildrenOnDelay delay={500}>
            <div className="WACLoadingBar__ConnectingAnimation" />
          </MountChildrenOnDelay>
        )}
      </div>
    );
  }

  /**
   * The error screen when a tour fails to load.
   */
  function renderTourErrorScreen() {
    return (
      <AnnounceOnMountComponent>
        <div className="WACTour__ErrorScreen">
          <div className="WACTour__ErrorHeader">
            <ErrorFilled size={20} className="WACTour__ErrorIcon" />
            {languagePack.tour_errorTitle}
          </div>
          <div className="WACTour__ErrorBody">
            <div className="WACTour__ErrorText">
              {languagePack.tour_errorBody}
            </div>
            {/* This button is for future use until dynamic steps are introduced. It won't do anything for now. */}
            <Button
              className="WACTour__ErrorButton"
              size="sm"
              kind="tertiary"
              renderIcon={(props) => <Restart size={32} {...props} />}
            >
              {languagePack.buttons_retry}
            </Button>
          </div>
        </div>
      </AnnounceOnMountComponent>
    );
  }

  useImperativeHandle(ref, () => tourControlsRef.current);

  useEffect(() => {
    if (isHydrated && !hideTour && !renderErrorScreen) {
      const tourInstructionsText = intl.formatMessage(
        { id: "tour_instructions" },
        { chatButtonText: languagePack.tour_ariaChatButton }
      );
      ariaAnnouncer(tourInstructionsText);
    }
  }, [
    hideTour,
    ariaAnnouncer,
    languagePack,
    intl,
    isHydrated,
    renderErrorScreen,
  ]);

  // This effect automatically applies focus to the tour when it hydrates or is opened. Checking for hydration will
  // allow the "done" button do get focus when it renders after hydration.
  useEffect(() => {
    if (isHydrated || !hideTour) {
      tourControlsRef.current?.requestFocus();
    }
  }, [hideTour, isHydrated]);

  return (
    // In the future this hiding may have to be done with visibility: hidden so that dynamic height animations can be
    // preformed.
    <HideComponent hidden={hideTour}>
      <div
        ref={rootRef}
        className="WACTour"
        role="region"
        aria-label={regionLabel}
      >
        {renderTourCloseMinimizeComponent()}
        {renderErrorScreen && renderTourErrorScreen()}
        {!renderErrorScreen && (
          <>
            {stepContentComponentsArray}
            {renderTourStepStatusContainer()}
            {renderTourControlsComponent()}
          </>
        )}
      </div>
    </HideComponent>
  );
}

const TourContainerExport = React.memo(React.forwardRef(TourContainer));
export default TourContainerExport;
