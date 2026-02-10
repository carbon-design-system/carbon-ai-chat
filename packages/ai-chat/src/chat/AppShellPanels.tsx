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
import cx from "classnames";
import ChatPanel from "@carbon/ai-chat-components/es/react/panel.js";
import { PanelHeader } from "./components/panels/PanelHeader";
import HydrationPanel from "./components/panels/HydrationPanel";
import DisclaimerPanel from "./components/panels/DisclaimerPanel";
import IFramePanel from "./components/panels/IFramePanel";
import ViewSourcePanel from "./components/panels/ViewSourcePanel";
import CatastrophicErrorPanel from "./components/panels/CatastrophicErrorPanel";
import { PanelWithFocus } from "./components/panels/PanelWithFocus";
import { BodyMessageComponents } from "./components-legacy/responseTypes/util/BodyMessageComponents";
import { FooterButtonComponents } from "./components-legacy/responseTypes/util/FooterButtonComponents";
import { MessageTypeComponent } from "./components-legacy/MessageTypeComponent";
import { Header } from "./components-legacy/header/Header";
import actions from "./store/actions";
import { DEFAULT_CUSTOM_PANEL_CONFIG_OPTIONS } from "./store/reducerUtils";
import type {
  CustomPanelConfigOptions,
  DefaultCustomPanelConfigOptions,
} from "../types/instance/apiTypes";
import type { ButtonItem, MessageResponse } from "../types/messaging/Messages";
import type { AppState } from "../types/state/AppState";
import type { HasRequestFocus } from "../types/utilities/HasRequestFocus";
import type { MessageTypeComponentProps } from "../types/messaging/MessageTypeComponentProps";
import { HasServiceManager } from "./hocs/withServiceManager";
import HasLanguagePack from "../types/utilities/HasLanguagePack";
import { BusEventType } from "../types/events/eventBusTypes";
import WriteableElement from "./components/util/WriteableElement";
import { PageObjectId } from "../testing/PageObjectId";

interface AppShellPanelsProps extends HasServiceManager, HasLanguagePack {
  isHydratingComplete: boolean;
  shouldShowHydrationPanel: boolean;
  onPanelOpenStart: (isPanel: boolean) => void;
  onPanelOpenEnd: () => void;
  onPanelCloseStart: () => void;
  onPanelCloseEnd: (isPanel: boolean) => void;
  onClose: () => void;
  onRestart: () => void;
  onToggleHomeScreen: () => void;
  isHomeScreenActive: boolean;
  customPanelState: AppState["customPanelState"];
  customPanelRef: React.RefObject<HasRequestFocus | null>;
  publicConfig: AppState["config"]["public"];
  showDisclaimer: boolean;
  disclaimerRef: React.RefObject<CDSButton | null>;
  onAcceptDisclaimer: () => void;
  responsePanelState: AppState["responsePanelState"];
  responsePanelRef: React.RefObject<HasRequestFocus | null>;
  requestFocus: () => void;
  iFramePanelState: AppState["iFramePanelState"];
  iframePanelRef: React.RefObject<HasRequestFocus | null>;
  viewSourcePanelState: AppState["viewSourcePanelState"];
  viewSourcePanelRef: React.RefObject<HasRequestFocus | null>;
  allMessagesByID: AppState["allMessagesByID"];
  inputState: AppState["assistantInputState"];
  config: AppState["config"];
  catastrophicErrorType: AppState["catastrophicErrorType"];
  assistantName: string;
}

function isCustomPanelConfigOptions(
  options: CustomPanelConfigOptions | DefaultCustomPanelConfigOptions,
): options is CustomPanelConfigOptions {
  const legacyOptions = options as Partial<CustomPanelConfigOptions>;
  return (
    typeof legacyOptions.disableDefaultCloseAction === "boolean" ||
    typeof legacyOptions.hideCloseButton === "boolean" ||
    typeof legacyOptions.onClickBack === "function" ||
    typeof legacyOptions.onClickRestart === "function" ||
    typeof legacyOptions.onClickClose === "function"
  );
}

/**
 * Renders all ChatPanel instances inside the `panels` slot of ChatShell.
 */
export function AppShellPanels({
  serviceManager,
  languagePack,
  isHydratingComplete,
  shouldShowHydrationPanel,
  onPanelOpenStart,
  onPanelOpenEnd,
  onPanelCloseStart,
  onPanelCloseEnd,
  onClose,
  onRestart,
  onToggleHomeScreen,
  isHomeScreenActive,
  customPanelState,
  customPanelRef,
  publicConfig,
  showDisclaimer,
  disclaimerRef,
  onAcceptDisclaimer,
  responsePanelState,
  responsePanelRef,
  requestFocus,
  iFramePanelState,
  iframePanelRef,
  viewSourcePanelState,
  viewSourcePanelRef,
  allMessagesByID,
  inputState,
  config,
  catastrophicErrorType,
  assistantName,
}: AppShellPanelsProps) {
  // Call DisclaimerPanel hook at component level (not inside render)
  const disclaimerContent = publicConfig.disclaimer?.isOn
    ? DisclaimerPanel({
        disclaimerHTML: publicConfig.disclaimer?.disclaimerHTML,
        disclaimerAcceptButtonRef: disclaimerRef,
        onAcceptDisclaimer: onAcceptDisclaimer,
      })
    : null;

  const customPanelOptions = customPanelState.options;
  const isLegacyCustomPanel = isCustomPanelConfigOptions(customPanelOptions);
  const legacyCustomPanelOptions = isLegacyCustomPanel
    ? (customPanelOptions as CustomPanelConfigOptions)
    : undefined;
  const shouldShowCustomPanelHeader = !(
    "hidePanelHeader" in customPanelOptions &&
    customPanelOptions.hidePanelHeader
  );
  const panelTitle = isLegacyCustomPanel
    ? (customPanelOptions.title ??
      config.derived.header?.title ??
      config.derived.header?.name ??
      assistantName)
    : customPanelOptions.title;
  const headerConfigOverride = isLegacyCustomPanel
    ? {
        hideMinimizeButton:
          typeof legacyCustomPanelOptions?.hideCloseButton === "boolean"
            ? legacyCustomPanelOptions.hideCloseButton
            : undefined,
        title:
          legacyCustomPanelOptions?.hideBackButton &&
          legacyCustomPanelOptions?.title
            ? legacyCustomPanelOptions.title
            : undefined,
      }
    : undefined;

  return (
    <div slot="panels">
      <ChatPanel
        open={Boolean(catastrophicErrorType)}
        aiEnabled={config.public.aiEnabled ? true : false}
        priority={100}
        fullWidth={false}
        showChatHeader={true}
      >
        <div slot="body" className="cds-aichat--widget--expand-to-fit">
          <CatastrophicErrorPanel
            assistantName={assistantName}
            languagePack={languagePack}
            onRestart={onRestart}
          />
        </div>
      </ChatPanel>
      <ChatPanel
        open={shouldShowHydrationPanel}
        priority={90}
        aiEnabled={config.public.aiEnabled ? true : false}
        fullWidth={false}
        showChatHeader={true}
        animationOnOpen="fade-in"
        animationOnClose="fade-out"
        onOpenStart={() => onPanelOpenStart(false)}
        onOpenEnd={onPanelOpenEnd}
        onCloseStart={onPanelCloseStart}
        onCloseEnd={() => {
          onPanelCloseEnd(false);
        }}
      >
        <div slot="body" className="cds-aichat--widget--expand-to-fit">
          <HydrationPanel
            isHydrated={isHydratingComplete}
            languagePack={languagePack}
          />
        </div>
      </ChatPanel>

      <ChatPanel
        open={customPanelState.isOpen}
        priority={60}
        fullWidth={
          "fullWidth" in customPanelState.options &&
          customPanelState.options.fullWidth
            ? true
            : false
        }
        showFrame={
          "showFrame" in customPanelState.options &&
          customPanelState.options.showFrame
            ? true
            : false
        }
        aiEnabled={
          "aiEnabled" in customPanelState.options &&
          customPanelState.options.aiEnabled
            ? true
            : false
        }
        showChatHeader={!isLegacyCustomPanel}
        animationOnOpen={
          customPanelState.options.disableAnimation
            ? "none"
            : "slide-in-from-bottom"
        }
        animationOnClose={
          customPanelState.options.disableAnimation
            ? "none"
            : "slide-out-to-bottom"
        }
        onOpenStart={() => {
          serviceManager.eventBus.fire(
            { type: BusEventType.CUSTOM_PANEL_PRE_OPEN },
            serviceManager.instance,
          );
          onPanelOpenStart(true);
        }}
        onOpenEnd={() => {
          serviceManager.eventBus.fire(
            { type: BusEventType.CUSTOM_PANEL_OPEN },
            serviceManager.instance,
          );
          onPanelOpenEnd();
        }}
        onCloseStart={() => {
          serviceManager.eventBus.fire(
            { type: BusEventType.CUSTOM_PANEL_PRE_CLOSE },
            serviceManager.instance,
          );
          onPanelCloseStart();
        }}
        onCloseEnd={() => {
          serviceManager.eventBus.fire(
            { type: BusEventType.CUSTOM_PANEL_CLOSE },
            serviceManager.instance,
          );
          serviceManager.store.dispatch(
            actions.setCustomPanelConfigOptions(
              DEFAULT_CUSTOM_PANEL_CONFIG_OPTIONS,
            ),
          );
          onPanelCloseEnd(true);
        }}
      >
        <PanelWithFocus
          ref={customPanelRef}
          header={
            shouldShowCustomPanelHeader ? (
              <>
                {isLegacyCustomPanel && (
                  <Header
                    onClose={() => {
                      if (
                        !legacyCustomPanelOptions?.disableDefaultCloseAction
                      ) {
                        onClose();
                      }
                      legacyCustomPanelOptions?.onClickClose?.();
                    }}
                    onRestart={() => {
                      onRestart();
                      legacyCustomPanelOptions?.onClickRestart?.();
                    }}
                    onToggleHomeScreen={onToggleHomeScreen}
                    headerDisplayName={assistantName}
                    isHomeScreenActive={isHomeScreenActive}
                    headerConfigOverride={headerConfigOverride}
                  />
                )}
                <div
                  className={cx("cds-aichat--panel-header", {
                    "cds-aichat--panel-header--full-width":
                      "fullWidth" in customPanelState.options &&
                      customPanelState.options.fullWidth,
                  })}
                >
                  <div className="cds-aichat--panel-header-content">
                    <PanelHeader
                      title={panelTitle}
                      labelBackButton={languagePack.general_returnToAssistant}
                      backButtonType={
                        "backButtonType" in customPanelState.options
                          ? customPanelState.options.backButtonType
                          : undefined
                      }
                      onClickBack={() => {
                        serviceManager.store.dispatch(
                          actions.setCustomPanelOpen(false),
                        );
                        "onClickBack" in customPanelState.options &&
                          customPanelState.options.onClickBack?.();
                      }}
                      showBackButton={
                        !(
                          "hideBackButton" in customPanelState.options &&
                          customPanelState.options.hideBackButton
                        )
                      }
                    />
                  </div>
                </div>
              </>
            ) : undefined
          }
          body={
            <WriteableElement
              slotName="customPanelElement"
              className="cds-aichat--custom-panel__content-container"
            />
          }
        />
      </ChatPanel>

      {disclaimerContent && (
        <ChatPanel
          open={showDisclaimer}
          priority={80}
          aiEnabled={config.public.aiEnabled ? true : false}
          fullWidth={true}
          showChatHeader={true}
          animationOnOpen="fade-in"
          animationOnClose="fade-out"
          onOpenStart={() => onPanelOpenStart(false)}
          onOpenEnd={onPanelOpenEnd}
          onCloseStart={onPanelCloseStart}
          onCloseEnd={() => onPanelCloseEnd(false)}
          onBodyScroll={disclaimerContent.onBodyScroll}
          data-testid={PageObjectId.DISCLAIMER_PANEL}
        >
          <div slot="body" className="cds-aichat--widget--expand-to-fit">
            {disclaimerContent.body}
          </div>
          <div slot="footer" className="cds-aichat--disclaimer__footer">
            {disclaimerContent.footer}
          </div>
        </ChatPanel>
      )}

      <ChatPanel
        open={responsePanelState.isOpen}
        priority={50}
        fullWidth={
          (responsePanelState.localMessageItem?.item as ButtonItem)?.panel
            .full_width
            ? true
            : false
        }
        showFrame={
          (responsePanelState.localMessageItem?.item as ButtonItem)?.panel
            .show_frame === undefined
            ? true
            : (responsePanelState.localMessageItem?.item as ButtonItem)?.panel
                .show_frame
        }
        aiEnabled={
          (responsePanelState.localMessageItem?.item as ButtonItem)?.panel
            .ai_enabled === undefined
            ? config.public.aiEnabled
            : (responsePanelState.localMessageItem?.item as ButtonItem)?.panel
                .ai_enabled
        }
        showChatHeader={
          (responsePanelState.localMessageItem?.item as ButtonItem)?.panel
            .show_header === undefined
            ? true
            : (responsePanelState.localMessageItem?.item as ButtonItem)?.panel
                .show_header
        }
        animationOnOpen="slide-in-from-bottom"
        animationOnClose="slide-out-to-bottom"
        onOpenStart={() => onPanelOpenStart(true)}
        onOpenEnd={onPanelOpenEnd}
        onCloseStart={onPanelCloseStart}
        onCloseEnd={() => {
          onPanelCloseEnd(true);
          serviceManager.store.dispatch(
            actions.setResponsePanelContent(null, false),
          );
        }}
      >
        {responsePanelState.localMessageItem &&
          (allMessagesByID[
            responsePanelState.localMessageItem?.fullMessageID
          ] as MessageResponse | undefined) && (
            <PanelWithFocus
              ref={responsePanelRef}
              header={
                (responsePanelState.localMessageItem?.item as ButtonItem)?.panel
                  .show_header !== false ? (
                  <PanelHeader
                    title={
                      (
                        responsePanelState.localMessageItem?.item as
                          | ButtonItem
                          | undefined
                      )?.panel?.title
                    }
                    labelBackButton={languagePack.general_returnToAssistant}
                    onClickBack={() =>
                      serviceManager.store.dispatch(
                        actions.setResponsePanelIsOpen(false),
                      )
                    }
                  />
                ) : undefined
              }
              body={
                <BodyMessageComponents
                  message={responsePanelState.localMessageItem}
                  originalMessage={
                    allMessagesByID[
                      responsePanelState.localMessageItem?.fullMessageID
                    ] as MessageResponse
                  }
                  languagePack={languagePack}
                  requestInputFocus={requestFocus}
                  disableUserInputs={inputState.isReadonly}
                  config={config}
                  isMessageForInput={responsePanelState.isMessageForInput}
                  scrollElementIntoView={() => {
                    /* no-op; shell handles layout */
                  }}
                  serviceManager={serviceManager}
                  hideFeedback
                  showChainOfThought={false}
                  allowNewFeedback={false}
                  renderMessageComponent={(
                    childProps: MessageTypeComponentProps,
                  ) => <MessageTypeComponent {...childProps} />}
                />
              }
              footer={
                <FooterButtonComponents
                  message={responsePanelState.localMessageItem}
                  originalMessage={
                    allMessagesByID[
                      responsePanelState.localMessageItem?.fullMessageID
                    ] as MessageResponse
                  }
                  languagePack={languagePack}
                  requestInputFocus={requestFocus}
                  disableUserInputs={inputState.isReadonly}
                  config={config}
                  isMessageForInput={responsePanelState.isMessageForInput}
                  scrollElementIntoView={() => {
                    /* no-op; shell handles layout */
                  }}
                  serviceManager={serviceManager}
                  hideFeedback
                  showChainOfThought={false}
                  allowNewFeedback={false}
                  renderMessageComponent={(
                    childProps: MessageTypeComponentProps,
                  ) => <MessageTypeComponent {...childProps} />}
                />
              }
            />
          )}
      </ChatPanel>

      <ChatPanel
        open={iFramePanelState.isOpen}
        priority={40}
        showFrame={true}
        fullWidth={false}
        showChatHeader={true}
        aiEnabled={config.public.aiEnabled ? true : false}
        animationOnOpen="slide-in-from-bottom"
        animationOnClose="slide-out-to-bottom"
        onOpenStart={() => onPanelOpenStart(true)}
        onOpenEnd={onPanelOpenEnd}
        onCloseStart={onPanelCloseStart}
        onCloseEnd={() => onPanelCloseEnd(true)}
      >
        <PanelWithFocus
          ref={iframePanelRef}
          header={
            <PanelHeader
              title={
                iFramePanelState.messageItem?.title ??
                iFramePanelState.messageItem?.source
              }
              labelBackButton={languagePack.general_returnToAssistant}
              onClickBack={() =>
                serviceManager.store.dispatch(actions.closeIFramePanel())
              }
            />
          }
          body={<IFramePanel messageItem={iFramePanelState.messageItem} />}
        />
      </ChatPanel>

      <ChatPanel
        open={viewSourcePanelState.isOpen}
        priority={30}
        showFrame={true}
        fullWidth={false}
        showChatHeader={true}
        aiEnabled={config.public.aiEnabled ? true : false}
        animationOnOpen="slide-in-from-bottom"
        animationOnClose="slide-out-to-bottom"
        onOpenStart={() => onPanelOpenStart(true)}
        onOpenEnd={onPanelOpenEnd}
        onCloseStart={onPanelCloseStart}
        onCloseEnd={() => onPanelCloseEnd(true)}
      >
        <PanelWithFocus
          ref={viewSourcePanelRef}
          header={
            <PanelHeader
              title={viewSourcePanelState.citationItem?.title}
              labelBackButton={languagePack.general_returnToAssistant}
              onClickBack={() =>
                serviceManager.store.dispatch(
                  actions.setViewSourcePanelIsOpen(false),
                )
              }
            />
          }
          body={
            <ViewSourcePanel
              citationItem={viewSourcePanelState.citationItem}
              relatedSearchResult={viewSourcePanelState.relatedSearchResult}
            />
          }
        />
      </ChatPanel>
    </div>
  );
}
