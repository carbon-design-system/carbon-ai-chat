/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

import VisuallyHidden from "../../util/VisuallyHidden";
import { Image, ImageProps } from "../image/Image";

interface ClickableImageProps extends ImageProps {
  /**
   * The button alt-text.
   */
  buttonAltText?: string;

  /**
   * Indicates if the component should render as a link instead of a button.
   */
  isLink?: boolean;

  /**
   * Indicates if the component should be in the disabled state.
   */
  disabled?: boolean;

  /**
   * The callback function to fire when the component is clicked.
   */
  onClick?: () => void;

  /**
   * Where to open the link. The default target is _self.
   */
  target?: string;
}

/**
 * This component is the same as the {@link Image} component, but makes it clickable. Depending on the props, it can
 * be a normal clickable tile or link.
 */
function ClickableImage({
  buttonAltText,
  isLink,
  target,
  disabled,
  onClick,
  ...imageProps
}: ClickableImageProps) {
  if (isLink) {
    return (
      <a
        className="cds-aichat--clickable-image"
        href={imageProps.displayURL}
        rel="noopener noreferrer"
        target={target}
        onClick={onClick}
      >
        <Image {...imageProps} />
        {buttonAltText && <VisuallyHidden>{buttonAltText}</VisuallyHidden>}
      </a>
    );
  }

  return (
    <button
      className="cds-aichat--clickable-image"
      type="button"
      onClick={onClick}
      disabled={disabled}
    >
      <Image {...imageProps} />
      {buttonAltText && <VisuallyHidden>{buttonAltText}</VisuallyHidden>}
    </button>
  );
}

export { ClickableImage };
