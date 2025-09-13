/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import Button, { BUTTON_KIND } from "../../../components/carbon/Button";
import cx from "classnames";
import React from "react";
import { useSelector } from "../../../hooks/useSelector";

import { useLanguagePack } from "../../../hooks/useLanguagePack";
import { AppState } from "../../../../types/state/AppState";
import { HasClassName } from "../../../../types/utilities/HasClassName";
import { ClickableImage } from "../util/ClickableImage";

interface BaseButtonComponentProps extends HasClassName {
  /**
   * The URL pointing to an image.
   */
  imageURL?: string;

  /**
   * The text that describes the image displayed if it fails to render or the user is unable to see it.
   */
  altText?: string;

  /**
   * The text to display in the button.
   */
  label?: string;

  /**
   * The button style.
   */
  // eslint-disable-next-line react/no-unused-prop-types
  kind?: BUTTON_KIND | "LINK";

  /**
   * The url to visit when the button is clicked.
   */
  url?: string;

  /**
   * Where to open the link. The default target is _self.
   */
  target?: string;

  /**
   * Determines if the button should be disabled.
   */
  disabled?: boolean;

  /**
   * The svg icon to render in the button.
   */
  renderIcon?: any;

  /**
   * The callback function to fire when the button is clicked.
   */
  onClick?: () => void;
}

/**
 * This is the base button component for the "button" response type.
 */
function BaseButtonItemComponent({
  className,
  label,
  kind,
  url,
  target = "_blank",
  disabled,
  renderIcon,
  imageURL,
  altText,
  onClick,
}: BaseButtonComponentProps) {
  const { errors_imageSource } = useLanguagePack();
  const aiEnabled = useSelector(
    (state: AppState) => state.config.derived.themeWithDefaults.aiEnabled,
  );
  const text = label || url;
  const linkTarget = url ? target : undefined;

  if (imageURL) {
    return (
      <ClickableImage
        imageError={errors_imageSource}
        source={imageURL}
        target={target}
        title={label}
        displayURL={url}
        altText={altText}
        renderIcon={renderIcon}
        onClick={onClick}
        disabled={disabled}
        isLink={Boolean(url)}
        useAITheme={aiEnabled}
      />
    );
  }
  const RenderIcon = renderIcon;
  const buttonKind = getButtonKind(kind) || "primary";
  return (
    <Button
      className={cx("cds-aichat--button-item", className)}
      kind={buttonKind as BUTTON_KIND}
      href={url}
      target={linkTarget}
      rel={url ? "noopener noreferrer" : undefined}
      disabled={disabled}
      onClick={onClick}
      tab-index="0"
    >
      {renderIcon && <RenderIcon slot="icon" />}
      {text}
    </Button>
  );
}

function getButtonKind(style: BUTTON_KIND | "LINK"): BUTTON_KIND {
  if (style == "LINK") {
    return BUTTON_KIND.GHOST;
  }
  return style;
}

export { BaseButtonItemComponent };
