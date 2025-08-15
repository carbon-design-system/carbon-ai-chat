/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { Button, ButtonKind } from "@carbon/react";
import cx from "classnames";
import React from "react";
import { useSelector } from "react-redux";

import { useLanguagePack } from "../../../hooks/useLanguagePack";
import { AppState } from "../../../../../types/state/AppState";
import { HasClassName } from "../../../../../types/utilities/HasClassName";
import { ClickableImage } from "../util/ClickableImage";
import { ButtonItemKind } from "../../../../../types/messaging/Messages";
import { ThemeType } from "../../../../../types/config/PublicConfig";

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
  kind?: ButtonItemKind;

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
  const theme = useSelector((state: AppState) => state.theme.theme);
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
        useAITheme={theme === ThemeType.CARBON_AI}
      />
    );
  }

  return (
    <Button
      className={cx("WACButtonItem", className)}
      as={url ? "a" : undefined}
      kind={getButtonKind(kind)}
      href={url}
      target={linkTarget}
      rel={url ? "noopener noreferrer" : undefined}
      disabled={disabled}
      renderIcon={renderIcon}
      onClick={onClick}
    >
      {text}
    </Button>
  );
}

function getButtonKind(style: ButtonItemKind): ButtonKind {
  switch (style) {
    case ButtonItemKind.LINK:
    case ButtonItemKind.TERTIARY:
      return "ghost";
    case ButtonItemKind.DEFAULT:
      return "primary";
    default:
      return style;
  }
}

export { BaseButtonItemComponent };
