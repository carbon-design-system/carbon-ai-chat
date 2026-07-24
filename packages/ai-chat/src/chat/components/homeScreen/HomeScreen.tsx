/*
 *  Copyright IBM Corp. 2025, 2026
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
import { carbonIconToReact } from "../../utils-react/carbonIcon";
import cx from "classnames";
import React from "react";
import { useSelector } from "../../hooks/useSelector";
import { shallowEqual } from "../../store/appStore";

import { useServiceManager } from "../../hooks/useServiceManager";
import { AppState } from "../../../types/state/AppState";

import { WriteableElementName } from "../../utils/constants";
import WriteableElement from "../util/WriteableElement";
import { MessageSendSource } from "../../../types/events/eventBusTypes";
import { SendOptions } from "../../../types/instance/ChatInstance";
import { PageObjectId } from "../../../testing/PageObjectId";

interface HomeScreenProps {
  isHydrated: boolean;

  /**
   * The callback function to fire when the user has clicked a starter button which gets the starter object passed into
   * it.
   */
  onSendInput: (
    text: string,
    source: MessageSendSource,
    options?: SendOptions,
  ) => Promise<void>;

  /**
   * The callback that can be called to toggle between the home screen and the bot view.
   */
  onToggleHomeScreen: () => void;
}

function HomeScreenComponent({
  onSendInput,
  isHydrated,
  onToggleHomeScreen,
}: HomeScreenProps) {
  const languagePack = useSelector(
    (state: AppState) => ({
      homeScreen_ariaHomeScreenContent:
        state.languagePack.homeScreen_ariaHomeScreenContent,
      homeScreen_returnToAssistant:
        state.languagePack.homeScreen_returnToAssistant,
    }),
    shallowEqual,
  );
  const serviceManager = useServiceManager();

  // Active home-screen config (derived/combined config). Selected here instead of
  // threaded from AppShell so HomeScreen owns its own data dependency.
  const homescreen = useSelector(
    (state: AppState) => state.config.public.homescreen,
  );

  const showBackToAssistant = useSelector(
    (state: AppState) =>
      state.persistedToBrowserStorage.homeScreenState.showBackToAssistant,
  );

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

  return (
    <div
      data-testid={PageObjectId.HOME_SCREEN_PANEL}
      className={cx("cds-aichat--home-screen", {
        "cds-aichat--home-screen--background-ai-theme": aiEnabled,
        "cds-aichat--home-screen--hydration-complete": isHydrated,
      })}
    >
      <div
        className="cds-aichat--home-screen__content"
        role="dialog"
        aria-label={languagePack.homeScreen_ariaHomeScreenContent}
      >
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
                    <div
                      // eslint-disable-next-line react/no-array-index-key
                      key={index}
                      className="cds-aichat--home-screen__starter-wrapper"
                    >
                      <ChatButton
                        size={CHAT_BUTTON_SIZE.SMALL}
                        kind={CHAT_BUTTON_KIND.TERTIARY}
                        isQuickAction
                        className="cds-aichat--home-screen__starter"
                        onClick={() =>
                          onSendInput(
                            starter.label,
                            MessageSendSource.HOME_SCREEN_STARTER,
                          )
                        }
                      >
                        {starter.label}
                      </ChatButton>
                    </div>
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
      </div>
    </div>
  );
}

const HomeScreenExport = React.memo(HomeScreenComponent);

export { HomeScreenExport as HomeScreen };
