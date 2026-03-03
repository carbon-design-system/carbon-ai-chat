/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cx from "classnames";
import React from "react";

interface MessagesViewProps {
  bottomScrollHandle: React.ReactNode;
  bottomSpacerRef: React.RefObject<HTMLDivElement>;
  humanAgentBanner: React.ReactNode;
  messagesContainerRef: React.RefObject<HTMLDivElement>;
  onScroll: () => void;
  regularMessages: React.ReactNode[];
  scrollDownButton?: React.ReactNode;
  scrollHandleHasFocus: boolean;
  topScrollHandle: React.ReactNode;
  typingIndicator?: React.ReactNode;
}

function MessagesView({
  bottomScrollHandle,
  bottomSpacerRef,
  humanAgentBanner,
  messagesContainerRef,
  onScroll,
  regularMessages,
  scrollDownButton,
  scrollHandleHasFocus,
  topScrollHandle,
  typingIndicator,
}: MessagesViewProps) {
  return (
    <div className="cds-aichat--messages--holder">
      {humanAgentBanner}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className={cx("cds-aichat--messages__wrapper", {
          "cds-aichat--messages__wrapper--scroll-handle-has-focus":
            scrollHandleHasFocus,
        })}
        ref={messagesContainerRef}
        onScroll={onScroll}
      >
        {topScrollHandle}
        <div className="cds-aichat--messages">
          {regularMessages}
          {typingIndicator}
          <div id="chat-bottom-spacer" ref={bottomSpacerRef} />
          {scrollDownButton}
        </div>
        {bottomScrollHandle}
      </div>
    </div>
  );
}

export { MessagesView };
