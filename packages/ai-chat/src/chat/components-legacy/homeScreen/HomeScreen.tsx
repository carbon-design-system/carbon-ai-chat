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
} from "@carbon/ai-chat-components/es/react/chat-button.js";
import ArrowRight16 from "@carbon/icons/es/arrow--right/16.js";
import { carbonIconToReact } from "../../utils/carbonIcon";
import cx from "classnames";
import React, { RefObject } from "react";
import { useSelector } from "../../hooks/useSelector";

import { useLanguagePack } from "../../hooks/useLanguagePack";
import { usePrevious } from "../../hooks/usePrevious";
import { useServiceManager } from "../../hooks/useServiceManager";
import { AppState } from "../../../types/state/AppState";

import { WriteableElementName } from "../../utils/constants";
import { Input, InputFunctions } from "../input/Input";
import WriteableElement from "../WriteableElement";
import { HomeScreenHeader } from "./HomeScreenHeader";
import {
  HomeScreenConfig,
  HomeScreenStarterButton,
} from "../../../types/config/HomeScreenConfig";
import { InputConfig } from "../../../types/config/PublicConfig";

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
  homeScreenMessageInputRef: RefObject<InputFunctions | null>;

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

  /**
   * Config for the input field located on the homescreen.
   */
  inputConfig?: InputConfig;
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
  inputConfig,
}: HomeScreenProps) {
  const languagePack = useLanguagePack();
  const serviceManager = useServiceManager();

  const { showBackToAssistant } = useSelector(
    (state: AppState) => state.persistedToBrowserStorage.homeScreenState,
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

  const { greeting, starters, customContentOnly } = homescreen || {};
  const homeScreenWithStarters =
    starters?.isOn && Boolean(starters.buttons?.length);

  const firstRender = isHydrated && !prevIsHydrated;
  return (
    <div
      className={cx("cds-aichat--home-screen", {
        "cds-aichat--home-screen--background-ai-theme": aiEnabled,
        "cds-aichat--home-screen--hydration-complete": isHydrated,
        "cds-aichat--home-screen--first-render": firstRender,
      })}
    >
      <HomeScreenHeader onRestart={onRestart} onClose={onClose} />
      <WriteableElement
        slotName={WriteableElementName.HOME_SCREEN_HEADER_BOTTOM_ELEMENT}
        className="cds-aichat--home-screen__home-screen-bottom-element"
        id={`homeScreenHeaderBottomElement${serviceManager.namespace.suffix}`}
      />
      <div className="cds-aichat--panel-content cds-aichat--home-screen__content">
        <div className="cds-aichat--home-screen__body-wrapper">
          <div
            className={cx("cds-aichat--home-screen__body", {
              "cds-aichat--home-screen__body--no-custom-content":
                !hasCustomContent,
              "cds-aichat--home-screen__body--custom-content": hasCustomContent,
              "cds-aichat--home-screen__body--custom-content-only":
                customContentOnly,
            })}
          >
            <div className="cds-aichat--home-screen__initial-content">
              {!customContentOnly && (
                <h2 className="cds-aichat--home-screen__greeting">
                  {greeting}
                </h2>
              )}
              {!customContentOnly && homeScreenWithStarters && (
                <div
                  className={cx("cds-aichat--home-screen__starters", {
                    // If there are more than 5 starters, animate in all starters at once.
                    "cds-aichat--home-screen__starters--animate-group":
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
                      className="cds-aichat--home-screen__starter"
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
            className={cx("cds-aichat--home-screen__custom-content", {
              "cds-aichat--home-screen__custom-content--custom-content-only":
                customContentOnly,
              "cds-aichat--home-screen__custom-content--animation":
                hasCustomContent || customContentOnly,
            })}
          >
            <WriteableElement
              slotName={WriteableElementName.HOME_SCREEN_AFTER_STARTERS_ELEMENT}
              id={`homeScreenAfterStartersElement${serviceManager.namespace.suffix}`}
            />
          </div>
        </div>
        <div
          className={cx("cds-aichat--home-screen__input-container-wrapper", {
            "cds-aichat--home-screen__input-container-wrapper--no-custom-content":
              !hasCustomContent && !customContentOnly,
          })}
        >
          {showBackToAssistant && (
            <ChatButton
              size={CHAT_BUTTON_SIZE.SMALL}
              kind={CHAT_BUTTON_KIND.SECONDARY}
              className="cds-aichat--home-screen__back-button"
              onClick={onToggleHomeScreen}
            >
              <span className="cds-aichat--home-screen__back-button-content">
                <span className="cds-aichat--home-screen__back-button-content-text">
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
          <div className="cds-aichat--home-screen__input-container">
            <Input
              ref={homeScreenMessageInputRef}
              onSendInput={onSendInput}
              disableInput={inputConfig?.isDisabled}
              isInputVisible={inputConfig?.isVisible !== false}
              disableSend={false}
              languagePack={languagePack}
              serviceManager={serviceManager}
              maxInputChars={inputConfig?.maxInputCharacters}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const HomeScreenExport = React.memo(HomeScreenComponent);

export { HomeScreenExport as HomeScreen };
