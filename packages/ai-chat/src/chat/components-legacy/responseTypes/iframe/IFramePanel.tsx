/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { forwardRef, Ref } from "react";
import { useSelector } from "../../../hooks/useSelector";

import { useLanguagePack } from "../../../hooks/useLanguagePack";
import { useServiceManager } from "../../../hooks/useServiceManager";
import actions from "../../../store/actions";
import { AppState } from "../../../../types/state/AppState";
import { HasRequestFocus } from "../../../../types/utilities/HasRequestFocus";
import { BasePanelComponent } from "../../BasePanelComponent";
import { IFrameComponent } from "./IFrameComponent";
import { OverlayPanelName } from "../../OverlayPanel";
import { BasePanelConfigOptions } from "../../../../types/utilities/BasePanelConfigOptions";

interface IFramePanelComponentProps extends BasePanelConfigOptions {
  /**
   * Indicates if the AI theme should be used.
   */
  useAITheme: boolean;
  onClickClose?: () => void;
  onClickRestart?: () => void;
}

/**
 * This panel is used to load the provided source url in an iframe for users to complete some action or view a piece
 * of content without having them leave Carbon AI Chat.
 */
function IFramePanelComponent(
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
      testIdPrefix={OverlayPanelName.IFRAME}
    >
      <div className="cds-aichat--i-frame-panel__content">
        {messageItem?.source && (
          <IFrameComponent
            key={
              messageItem?.source /* This is important since it causes the IFrame to re-mount when the source changes */
            }
            source={messageItem?.source}
            title={iframeTitle}
          />
        )}
      </div>
    </BasePanelComponent>
  );
}

const IFramePanelExport = React.memo(forwardRef(IFramePanelComponent));

export { IFramePanelExport as IFramePanel };

export default IFramePanelExport;

export type { IFramePanelComponentProps };
