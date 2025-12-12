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
import { SearchResultBodyWithCitationHighlighted } from "../components-legacy/responseTypes/util/SearchResultBody";
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

/**
 * This panel is used to show the text of a conversational search citation.
 */
function ViewSourcePanelContent(
  props: BasePanelConfigOptions,
  ref: Ref<HasRequestFocus>,
) {
  const languagePack = useLanguagePack();
  const { store } = useServiceManager();
  const { isOpen, citationItem, relatedSearchResult } = useSelector(
    (state: AppState) => state.viewSourcePanelState,
  );

  let content: React.ReactNode = null;

  if (citationItem) {
    if (relatedSearchResult) {
      content = (
        <SearchResultBodyWithCitationHighlighted
          relatedSearchResult={relatedSearchResult}
          citationItem={citationItem}
        />
      );
    } else {
      content = citationItem.text;
    }
  }

  return (
    <BasePanelComponent
      {...props}
      ref={ref}
      className="cds-aichat--view-source-panel"
      isOpen={isOpen}
      onClickBack={() =>
        store.dispatch(actions.setViewSourcePanelIsOpen(false))
      }
      title={citationItem?.title}
      labelBackButton={languagePack.general_ariaCloseInformationOverlay}
      eventName="Search citation panel opened"
      eventDescription="A user has opened the search citation panel"
      showAiLabel={false}
      showRestartButton={false}
    >
      <div className="cds-aichat--view-source-panel__content">{content}</div>
    </BasePanelComponent>
  );
}

const ForwardedViewSourcePanel = forwardRef<
  HasRequestFocus,
  BasePanelConfigOptions
>(ViewSourcePanelContent);

interface ViewSourcePanelProps extends HasServiceManager {
  isOpen: boolean;
  panelRef: React.RefObject<HasRequestFocus | null>;
  onOpenStart: () => void;
  onOpenEnd: () => void;
  onCloseStart: () => void;
  onCloseEnd: () => void;
  onClickClose: () => void;
  onClickRestart: () => void;
}

const ViewSourcePanel: React.FC<ViewSourcePanelProps> = ({
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
    overlayPanelName={PageObjectId.CONVERSATIONAL_SEARCH_CITATION_PANEL}
    hasBackButton
  >
    <ForwardedViewSourcePanel
      ref={panelRef}
      onClickClose={onClickClose}
      onClickRestart={onClickRestart}
    />
  </OverlayPanel>
);

export default ViewSourcePanel;
