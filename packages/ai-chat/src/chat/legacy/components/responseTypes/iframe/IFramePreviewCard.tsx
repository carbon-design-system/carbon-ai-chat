/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import ArrowRight16 from "@carbon/icons/es/arrow--right/16.js";
import { carbonIconToReact } from "../../../../utils/carbonIcon";
import React from "react";
import { useIntl } from "react-intl";
import { useSelector } from "react-redux";

import { useLanguagePack } from "../../../../hooks/useLanguagePack";
import { useServiceManager } from "../../../../hooks/useServiceManager";
import actions from "../../../../store/actions";
import { AppState } from "../../../../../types/state/AppState";
import { HasDoAutoScroll } from "../../../../../types/utilities/HasDoAutoScroll";
import { getURLHostName } from "../../../../utils/browserUtils";
import VisuallyHidden from "../../util/VisuallyHidden";
import { ClickableImage } from "../util/ClickableImage";
import { IFrameItem } from "../../../../../types/messaging/Messages";

interface IFramePreviewCardComponentProps extends HasDoAutoScroll {
  /**
   * The iframe response type item.
   */
  messageItem: IFrameItem;
}

/**
 * The iframe preview card for the page source. This is a button that can be clicked in order to open the frame panel.
 */
function IFramePreviewCardComponent({
  messageItem,
  doAutoScroll,
}: IFramePreviewCardComponentProps) {
  const { source, image_url, title, description } = messageItem;
  const aiEnabled = useSelector(
    (state: AppState) => state.config.derived.themeWithDefaults.aiEnabled,
  );
  const urlHostName = getURLHostName(source);
  const { store } = useServiceManager();
  const { iframe_ariaImageAltText } = useLanguagePack();
  const intl = useIntl();
  const iframeAriaClickPreviewCardMessage = intl.formatMessage(
    { id: "iframe_ariaClickPreviewCard" },
    { source: urlHostName },
  );
  const ArrowRight = carbonIconToReact(ArrowRight16);

  /**
   * Set iframe content to be loaded in the iframe panel.
   */
  function handleCardClick() {
    // If tanya has authored an iframe response type and has provided no page source, we don't want the preview card to
    // open the iframe panel.
    if (source) {
      store.dispatch(actions.setIFrameContent(messageItem));
    }
  }

  /**
   * Handles making the image element visible by updating the image loading flag and triggering an auto scroll.
   */
  function handleImageLoaded() {
    // Call doAutoScroll to account for the image container height change after the image has loaded.
    doAutoScroll?.();
  }

  return (
    <div>
      <ClickableImage
        title={title}
        description={description}
        source={image_url}
        displayURL={source}
        altText={iframe_ariaImageAltText}
        onImageLoad={handleImageLoaded}
        renderIcon={ArrowRight}
        onClick={handleCardClick}
        preventInlineError
        useAITheme={aiEnabled}
      />
      <VisuallyHidden>{iframeAriaClickPreviewCardMessage}</VisuallyHidden>
    </div>
  );
}

const IFramePreviewCardExport = React.memo(IFramePreviewCardComponent);

export { IFramePreviewCardExport as IFramePreviewCard };
