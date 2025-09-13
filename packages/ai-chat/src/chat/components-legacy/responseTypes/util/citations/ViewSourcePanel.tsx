/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { forwardRef, Ref } from "react";
import { useSelector } from "../../../../hooks/useSelector";

import { useLanguagePack } from "../../../../hooks/useLanguagePack";
import { useServiceManager } from "../../../../hooks/useServiceManager";
import actions from "../../../../store/actions";
import { AppState } from "../../../../../types/state/AppState";
import { HasRequestFocus } from "../../../../../types/utilities/HasRequestFocus";
import { BasePanelComponent } from "../../../BasePanelComponent";
import { SearchResultBodyWithCitationHighlighted } from "../SearchResultBody";
import { OverlayPanelName } from "../../../OverlayPanel";
import { BasePanelConfigOptions } from "../../../../../types/utilities/BasePanelConfigOptions";

/**
 * This panel is used to show the text of a conversational search citation.
 */
function ViewSourcePanel(
  props: BasePanelConfigOptions,
  ref: Ref<HasRequestFocus>,
) {
  const languagePack = useLanguagePack();
  const { store } = useServiceManager();
  const { isOpen, citationItem, relatedSearchResult } = useSelector(
    (state: AppState) => state.viewSourcePanelState,
  );

  let content;

  if (citationItem) {
    // If text is in the citation item then this is a conversational search source that is being shown.
    if (relatedSearchResult) {
      // If there is a related search result than show the search result body with the citation text highlighted.
      content = (
        <SearchResultBodyWithCitationHighlighted
          relatedSearchResult={relatedSearchResult}
          citationItem={citationItem}
        />
      );
    } else {
      // If there is no related search result than show the citation text.
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
      testIdPrefix={OverlayPanelName.CONVERSATIONAL_SEARCH_CITATION}
    >
      <div className="cds-aichat--view-source-panel__content">{content}</div>
    </BasePanelComponent>
  );
}

const ViewSourcePanelExport = forwardRef(ViewSourcePanel);
export { ViewSourcePanelExport as ViewSourcePanel };
export default ViewSourcePanelExport;
