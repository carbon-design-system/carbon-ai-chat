/*
 *  Copyright IBM Corp. 2025, 2026
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
import { Header } from "./components/header/Header";
import { useSelector } from "./hooks/useSelector";
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
import { shallowEqual } from "./store/appStore";
import { BusEventType } from "../types/events/eventBusTypes";
import WriteableElement from "./components/util/WriteableElement";
import { PageObjectId } from "../testing/PageObjectId";

interface AppShellPanelsProps extends HasServiceManager {
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
  historyPanelState: AppState["historyPanelState"];
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
  isInputReadonly: boolean;
  catastrophicErrorPanelState: AppState["catastrophicErrorPanelState"];
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
export const AppShellPanels = React.memo(function AppShellPanels({
  serviceManager,
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
  historyPanelState,
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
  isInputReadonly,
  catastrophicErrorPanelState,
}: AppShellPanelsProps) {
  // Only the panel aria labels this host renders — a narrow bag (shallowEqual)
  // so editing an unrelated string doesn't re-render every panel. Bag keys match
  // the `languagePack.<key>` read sites below verbatim.
  const languagePack = useSelector(
    (state: AppState) => ({
      aria_catastrophicErrorPanel:
        state.languagePack.aria_catastrophicErrorPanel,
      aria_customPanel: state.languagePack.aria_customPanel,
      aria_disclaimerPanel: state.languagePack.aria_disclaimerPanel,
      aria_hydrationPanel: state.languagePack.aria_hydrationPanel,
      aria_iframePanel: state.languagePack.aria_iframePanel,
      aria_responsePanel: state.languagePack.aria_responsePanel,
      aria_viewSourcePanel: state.languagePack.aria_viewSourcePanel,
      general_returnToAssistant: state.languagePack.general_returnToAssistant,
    }),
    shallowEqual,
  );

  // Narrow config selections: each stays referentially stable across unrelated
  // config changes (reconcileAppConfigReferences preserves the `disclaimer`
  // sub-object reference; the rest are primitives), so this memoized panel host
  // re-renders only when one of these specific values changes — not on every
  // config field change the way selecting whole `config`/`publicConfig` did.
  const aiEnabled = useSelector(
    (state: AppState) => state.config.public.aiEnabled,
  );
  const disclaimer = useSelector(
    (state: AppState) => state.config.public.disclaimer,
  );
  const historyIsOn = useSelector(
    (state: AppState) => state.config.public.history?.isOn,
  );

  // Call DisclaimerPanel hook at component level (not inside render)
  const disclaimerContent = disclaimer?.isOn
    ? DisclaimerPanel({
        disclaimerHTML: disclaimer?.disclaimerHTML,
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
  const panelTitle = customPanelOptions.title;
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
        panelAriaLabel={languagePack.aria_catastrophicErrorPanel}
        open={Boolean(catastrophicErrorPanelState?.isOpen)}
        aiEnabled={aiEnabled ? true : false}
        priority={100}
        fullWidth={false}
        showChatHeader={true}
      >
        <div slot="body" className="cds-aichat--widget--expand-to-fit">
          <CatastrophicErrorPanel
            title={catastrophicErrorPanelState?.title}
            bodyText={catastrophicErrorPanelState?.bodyText}
            hideRetryButton={catastrophicErrorPanelState?.hideRetryButton}
            onRestart={onRestart}
          />
        </div>
      </ChatPanel>
      <ChatPanel
        panelAriaLabel={languagePack.aria_hydrationPanel}
        open={shouldShowHydrationPanel}
        priority={90}
        aiEnabled={aiEnabled ? true : false}
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
          <HydrationPanel isHydrated={isHydratingComplete} />
        </div>
      </ChatPanel>

      <ChatPanel
        panelAriaLabel={panelTitle || languagePack.aria_customPanel}
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
        showChatHeader={
          !isLegacyCustomPanel &&
          "showChatHeader" in customPanelState.options &&
          customPanelState.options.showChatHeader
            ? true
            : false
        }
        animationOnOpen={
          customPanelState.options.disableAnimation
            ? "none"
            : "openFromSide" in customPanelState.options &&
                customPanelState.options.openFromSide
              ? "slide-in-from-start"
              : "slide-in-from-bottom"
        }
        animationOnClose={
          customPanelState.options.disableAnimation
            ? "none"
            : "openFromSide" in customPanelState.options &&
                customPanelState.options.openFromSide
              ? "slide-out-to-start"
              : "slide-out-to-bottom"
        }
        openFromSide={
          "openFromSide" in customPanelState.options &&
          customPanelState.options.openFromSide
            ? true
            : false
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
                      backButtonPosition={
                        "backButtonPosition" in customPanelState.options
                          ? customPanelState.options.backButtonPosition
                          : undefined
                      }
                      openFromSide={
                        "openFromSide" in customPanelState.options &&
                        customPanelState.options.openFromSide
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
          panelAriaLabel={languagePack.aria_disclaimerPanel}
          open={showDisclaimer}
          priority={80}
          aiEnabled={aiEnabled ? true : false}
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
        panelAriaLabel={
          (responsePanelState.localMessageItem?.item as ButtonItem)?.panel
            .title || languagePack.aria_responsePanel
        }
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
            ? aiEnabled
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
                  requestInputFocus={requestFocus}
                  disableUserInputs={isInputReadonly}
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
                  requestInputFocus={requestFocus}
                  disableUserInputs={isInputReadonly}
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
        panelAriaLabel={
          iFramePanelState.messageItem?.title ||
          iFramePanelState.messageItem?.source ||
          languagePack.aria_iframePanel
        }
        open={iFramePanelState.isOpen}
        priority={40}
        showFrame={true}
        fullWidth={false}
        showChatHeader={true}
        aiEnabled={aiEnabled ? true : false}
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
        panelAriaLabel={
          viewSourcePanelState.citationItem?.title ||
          languagePack.aria_viewSourcePanel
        }
        open={viewSourcePanelState.isOpen}
        priority={30}
        showFrame={true}
        fullWidth={false}
        showChatHeader={true}
        aiEnabled={aiEnabled ? true : false}
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

      {historyIsOn && historyPanelState.isMobile && (
        <ChatPanel
          open={historyPanelState.isOpen}
          priority={3}
          fullWidth={true}
          bodyNoPadding={true}
          noScroll={true}
          aiEnabled={aiEnabled ? true : false}
          animationOnOpen="slide-in-from-start"
          animationOnClose="slide-out-to-start"
          onOpenStart={() => onPanelOpenStart(true)}
          onOpenEnd={onPanelOpenEnd}
          onCloseStart={onPanelCloseStart}
          onCloseEnd={() => {
            onPanelCloseEnd(true);
            serviceManager.store.dispatch(actions.setHistoryPanelOpen(false));
          }}
        >
          <PanelWithFocus
            body={
              <WriteableElement
                slotName="historyPanelElement"
                className="cds-aichat--history-panel__content-container"
              />
            }
          />
        </ChatPanel>
      )}
    </div>
  );
});
