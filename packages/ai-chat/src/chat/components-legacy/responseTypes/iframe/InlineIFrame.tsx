/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useCallback, useState, useLayoutEffect, useRef } from "react";

import { useAriaAnnouncer } from "../../../hooks/useAriaAnnouncer";
import { useLanguagePack } from "../../../hooks/useLanguagePack";
import { HasDoAutoScroll } from "../../../../types/utilities/HasDoAutoScroll";
import { getMediaDimensions } from "../../../utils/messageUtils";
import { getResponsiveElementPaddingValue } from "../../../utils/miscUtils";
import InlineError from "../error/InlineError";
import { IFrameComponent } from "./IFrameComponent";
import { IFrameItem } from "../../../../types/messaging/Messages";

interface InlineIframeProps extends HasDoAutoScroll {
  /**
   * The iframe response type item.
   */
  messageItem: IFrameItem;
}

/**
 * This component renders an inline iframe for iframe response types using the chat display "inline" option.
 */
function InlineIFrame({ messageItem, doAutoScroll }: InlineIframeProps) {
  const ariaAnnouncer = useAriaAnnouncer();
  const { errors_iframeSource } = useLanguagePack();
  const [isError, setIsError] = useState(false);
  const { source, title } = messageItem;
  const baseHeight = getMediaDimensions(messageItem)?.base_height;
  const paddingTop = getResponsiveElementPaddingValue(baseHeight);
  const iframeTitle = title || source;

  const iframeRef = useRef<HTMLDivElement>(null);

  // set padding-top style dynamically
  useLayoutEffect(() => {
    if (iframeRef && paddingTop) {
      iframeRef.current.style.setProperty("padding-block-start", paddingTop);
    }
  }, [paddingTop]);

  /**
   * Render an error message and announce it when the iframe component times out.
   */
  const onTimeoutOverride = useCallback(() => {
    setIsError(true);
    ariaAnnouncer(errors_iframeSource);
  }, [ariaAnnouncer, errors_iframeSource]);

  if (isError) {
    return <InlineError text={errors_iframeSource} />;
  }

  return (
    // eslint-disable-next-line react/forbid-dom-props
    <div className="cds-aichat--inline-i-frame" ref={iframeRef}>
      <IFrameComponent
        source={source}
        title={iframeTitle}
        onTimeoutOverride={onTimeoutOverride}
        onLoad={() => doAutoScroll?.()}
      />
    </div>
  );
}

export { InlineIFrame };
