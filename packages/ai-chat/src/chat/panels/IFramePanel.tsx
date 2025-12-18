/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { forwardRef, Ref } from "react";

import { OverlayPanel } from "../components-legacy/OverlayPanel";
import { BasePanelComponent } from "../components-legacy/BasePanelComponent";
import { IFrameComponent } from "../components-legacy/responseTypes/iframe/IFrameComponent";
import { HasServiceManager } from "../hocs/withServiceManager";
import { useSelector } from "../hooks/useSelector";
import { useLanguagePack } from "../hooks/useLanguagePack";
import { useServiceManager } from "../hooks/useServiceManager";
import actions from "../store/actions";
import {
  AnimationInType,
  AnimationOutType,
} from "../../types/utilities/Animation";
import { PageObjectId } from "../../testing/PageObjectId";
import type { HasRequestFocus } from "../../types/utilities/HasRequestFocus";
import type { BasePanelConfigOptions } from "../../types/utilities/BasePanelConfigOptions";
import type { AppState } from "../../types/state/AppState";

interface IFramePanelComponentProps extends BasePanelConfigOptions {
  onClickClose?: () => void;
  onClickRestart?: () => void;
}

function IFramePanelComponentInner(
  props: IFramePanelComponentProps,
  ref: Ref<HasRequestFocus>,
) {
  const languagePack = useLanguagePack();
  const { store } = useServiceManager();
  const { isOpen, messageItem } = useSelector(
    (state: AppState) => state.iFramePanelState,
  );
  const iframeTitle = messageItem?.title || messageItem?.source;

  return (
    <BasePanelComponent
      {...props}
      ref={ref}
      className="cds-aichat--i-frame-panel"
      isOpen={isOpen}
      onClickBack={() => store.dispatch(actions.closeIFramePanel())}
      title={iframeTitle}
      labelBackButton={languagePack.iframe_ariaClosePanel}
      eventName="IFrame panel opened"
      eventDescription="A user has opened the IFrame panel"
      showAiLabel={false}
      showRestartButton={false}
    >
      <div className="cds-aichat--i-frame-panel__content">
        {messageItem?.source && (
          <IFrameComponent
            key={messageItem?.source}
            source={messageItem?.source}
            title={iframeTitle}
          />
        )}
      </div>
    </BasePanelComponent>
  );
}

const ForwardedIFramePanel = forwardRef<
  HasRequestFocus,
  IFramePanelComponentProps
>(IFramePanelComponentInner);

interface IFramePanelProps extends HasServiceManager {
  isOpen: boolean;
  panelRef: React.RefObject<HasRequestFocus | null>;
  onOpenStart: () => void;
  onOpenEnd: () => void;
  onCloseStart: () => void;
  onCloseEnd: () => void;
  onClickClose: () => void;
  onClickRestart: () => void;
}

const IFramePanel: React.FC<IFramePanelProps> = ({
  serviceManager,
  isOpen,
  panelRef,
  onOpenStart,
  onOpenEnd,
  onCloseStart,
  onCloseEnd,
  onClickClose,
  onClickRestart,
}) => (
  <OverlayPanel
    className="cds-aichat--overlay--covering"
    onOpenStart={onOpenStart}
    onCloseStart={onCloseStart}
    onOpenEnd={onOpenEnd}
    onCloseEnd={onCloseEnd}
    animationOnOpen={AnimationInType.SLIDE_IN_FROM_BOTTOM}
    animationOnClose={AnimationOutType.SLIDE_OUT_TO_BOTTOM}
    shouldOpen={isOpen}
    serviceManager={serviceManager}
    overlayPanelName={PageObjectId.IFRAME_PANEL}
    hasBackButton
  >
    <ForwardedIFramePanel
      ref={panelRef}
      onClickClose={onClickClose}
      onClickRestart={onClickRestart}
    />
  </OverlayPanel>
);

export default IFramePanel;
export type { IFramePanelComponentProps };
