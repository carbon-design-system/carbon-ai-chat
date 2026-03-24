/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";
import ClickableTile from "../components/carbon/ClickableTile";
import { IS_MOBILE } from "../utils/browserUtils";

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
  // Handle keyboard activation (Enter or Space) and Escape to close
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      // Blur the element to close/hide it
      event.preventDefault();
      (event.target as HTMLElement).blur();
    } else if ((event.key === "Enter" || event.key === " ") && onClick) {
      event.preventDefault();
      onClick();
    }
  };

  // On mobile, use the original button (hidden by default, visible on focus)
  if (IS_MOBILE) {
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

  // On desktop, use Carbon clickable tile with visible text
  return (
    <ClickableTile
      className="cds-aichat--messages--scroll-handle-desktop"
      ref={buttonRef as any}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      {ariaLabel}
    </ClickableTile>
  );
}

export { MessagesScrollHandle };
