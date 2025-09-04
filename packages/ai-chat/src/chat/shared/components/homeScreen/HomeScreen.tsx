/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import ChatButton, {
  CHAT_BUTTON_KIND,
  CHAT_BUTTON_SIZE,
} from "../../../react/carbon/ChatButton";
import ArrowRight16 from "@carbon/icons/es/arrow--right/16.js";
import { carbonIconToReact } from "../../utils/carbonIcon";
import cx from "classnames";
import React, { RefObject } from "react";
import { useSelector } from "react-redux";

import { useLanguagePack } from "../../hooks/useLanguagePack";
import { usePrevious } from "../../hooks/usePrevious";
import { useServiceManager } from "../../hooks/useServiceManager";
import { AppState } from "../../../../types/state/AppState";

import { WriteableElementName } from "../../utils/constants";
import { Input, InputFunctions } from "../input/Input";
import WriteableElement from "../WriteableElement";
import { HomeScreenHeader } from "./HomeScreenHeader";
import {
  HomeScreenConfig,
  HomeScreenStarterButton,
} from "../../../../types/config/HomeScreenConfig";
import { OverlayPanelName } from "../OverlayPanel";

interface HomeScreenProps {
  isHydrated: boolean;

  /**
   * Active config for home screen derived from combining remote and local config.
   */
  homescreen: HomeScreenConfig;

  /**
   * The callback function to fire when the user clicks the send button which gets the input text passed into it.
   */
  onSendInput: (text: string) => void;

  /**
   * The callback function to fire when the user has clicked a starter button which gets the starter object passed into
   * it.
   */
  onStarterClick: (starter: HomeScreenStarterButton) => void;

  /**
   * Forwarded ref from App.tsx to use to manage input focus.
   */
  homeScreenMessageInputRef: RefObject<InputFunctions>;

  /**
   * A callback function called when the close button is clicked.
   */
  onClose: () => void;

  /**
   * Method to call when restart button is pressed.
   */
  onRestart: () => void;

  /**
   * The callback that can be called to toggle between the home screen and the bot view.
   */
  onToggleHomeScreen: () => void;
}

function HomeScreenComponent({
  homescreen,
  homeScreenMessageInputRef,
  onStarterClick,
  onSendInput,
  isHydrated,
  onClose,
  onRestart,
  onToggleHomeScreen,
}: HomeScreenProps) {
  const languagePack = useLanguagePack();
  const serviceManager = useServiceManager();

  const { showBackToBot } = useSelector(
    (state: AppState) =>
      state.persistedToBrowserStorage.chatState.homeScreenState,
  );

  const prevIsHydrated = usePrevious(isHydrated);
  const ArrowRight = carbonIconToReact(ArrowRight16);

  const aiEnabled = useSelector(
    (state: AppState) => state.config.derived.themeWithDefaults.aiEnabled,
  );

  const homeScreenWriteableElement =
    serviceManager.writeableElements[
      WriteableElementName.HOME_SCREEN_AFTER_STARTERS_ELEMENT
    ];
  const hasCustomContent = homeScreenWriteableElement.hasChildNodes();

  const { greeting, starters, custom_content_only } = homescreen || {};
  const homeScreenWithStarters =
    starters?.is_on && Boolean(starters.buttons?.length);

  const firstRender = isHydrated && !prevIsHydrated;
  return (
    <div
      className={cx("WACHomeScreen", {
        "WACHomeScreen--backgroundAITheme": aiEnabled,
        "WACHomeScreen--hydrationComplete": isHydrated,
        "WACHomeScreen--firstRender": firstRender,
      })}
    >
      <HomeScreenHeader onRestart={onRestart} onClose={onClose} />
      <WriteableElement
        slotName={WriteableElementName.HOME_SCREEN_HEADER_BOTTOM_ELEMENT}
        className="WACHomeScreen__HomeScreenBottomElement"
        id={`homeScreenHeaderBottomElement${serviceManager.namespace.suffix}`}
      />
      <div className="WACPanelContent WACHomeScreen__content">
        <div className="WACHomeScreen__bodyWrapper">
          <div
            className={cx("WACHomeScreen__body", {
              "WACHomeScreen__body--noCustomContent": !hasCustomContent,
              "WACHomeScreen__body--customContent": hasCustomContent,
              "WACHomeScreen__body--customContentOnly": custom_content_only,
            })}
          >
            <div className="WACHomeScreen__initialContent">
              {!custom_content_only && (
                <div className="WACHomeScreen__greeting">{greeting}</div>
              )}
              {!custom_content_only && homeScreenWithStarters && (
                <div
                  className={cx("WACHomeScreen__starters", {
                    // If there are more than 5 starters, animate in all starters at once.
                    "WACHomeScreen__starters--animateGroup":
                      starters.buttons.length > 5,
                  })}
                >
                  {starters.buttons.map((starter, index) => (
                    <ChatButton
                      size={CHAT_BUTTON_SIZE.SMALL}
                      kind={CHAT_BUTTON_KIND.TERTIARY}
                      isQuickAction
                      // eslint-disable-next-line react/no-array-index-key
                      key={index}
                      className="WACHomeScreen__starter"
                      onClick={() => onStarterClick(starter)}
                    >
                      {starter.label}
                    </ChatButton>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div
            className={cx("WACHomeScreen__customContent", {
              "WACHomeScreen__customContent--customContentOnly":
                custom_content_only,
              "WACHomeScreen__customContent--animation":
                hasCustomContent || custom_content_only,
            })}
          >
            <WriteableElement
              slotName={WriteableElementName.HOME_SCREEN_AFTER_STARTERS_ELEMENT}
              id={`homeScreenAfterStartersElement${serviceManager.namespace.suffix}`}
            />
          </div>
        </div>
        <div
          className={cx("WACHomeScreen__inputContainerWrapper", {
            "WACHomeScreen__inputContainerWrapper--noCustomContent":
              !hasCustomContent && !custom_content_only,
          })}
        >
          {showBackToBot && (
            <ChatButton
              size={CHAT_BUTTON_SIZE.SMALL}
              kind={CHAT_BUTTON_KIND.SECONDARY}
              className="WACHomeScreen__backButton"
              onClick={onToggleHomeScreen}
            >
              <span className="WACHomeScreen__backButtonContent">
                <span className="WACHomeScreen__backButtonContentText">
                  {languagePack.homeScreen_returnToAssistant}
                </span>
                <ArrowRight />
              </span>
            </ChatButton>
          )}
          <WriteableElement
            slotName={WriteableElementName.HOME_SCREEN_BEFORE_INPUT_ELEMENT}
            id={`homeScreenBeforeInputElement${serviceManager.namespace.suffix}`}
          />
          <div className="WACHomeScreen__inputContainer">
            <Input
              ref={homeScreenMessageInputRef}
              onSendInput={onSendInput}
              disableInput={false}
              isInputVisible
              disableSend={false}
              languagePack={languagePack}
              serviceManager={serviceManager}
              testIdPrefix={OverlayPanelName.HOME_SCREEN}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const HomeScreenExport = React.memo(HomeScreenComponent);

export { HomeScreenExport as HomeScreen };
