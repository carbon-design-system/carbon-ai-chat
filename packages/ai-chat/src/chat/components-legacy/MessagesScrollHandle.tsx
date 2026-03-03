/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

interface MessagesScrollHandleProps {
  ariaLabel: string;
  buttonRef: React.RefObject<HTMLButtonElement>;
  onBlur: () => void;
  onClick?: () => void;
  onFocus: () => void;
}

function MessagesScrollHandle({
  ariaLabel,
  buttonRef,
  onBlur,
  onClick,
  onFocus,
}: MessagesScrollHandleProps) {
  return (
    <button
      type="button"
      className="cds-aichat--messages--scroll-handle"
      ref={buttonRef}
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={onClick}
      onFocus={onFocus}
      onBlur={onBlur}
    />
  );
}

export { MessagesScrollHandle };
