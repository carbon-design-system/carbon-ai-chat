/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import ChatButton, {
  CHAT_BUTTON_KIND,
  CHAT_BUTTON_SIZE,
} from "@carbon/ai-chat-components/es/react/chat-button.js";
import cx from "classnames";
import React from "react";
import { useSelector } from "../../../hooks/useSelector";

import { AppState } from "../../../../types/state/AppState";
import { HasClassName } from "../../../../types/utilities/HasClassName";
import { ClickableImage } from "../../../components-legacy/responseTypes/util/ClickableImage";
import Button, { BUTTON_KIND, BUTTON_SIZE } from "../../carbon/Button";

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
  kind?: BUTTON_KIND | CHAT_BUTTON_KIND | "LINK";

  /**
   * The button size.
   */
  size?: BUTTON_SIZE | CHAT_BUTTON_SIZE;

  /**
   * Whether the button should be rendered as a standard carbon button.
   *
   * @internal
   */
  is?: "standard-button";

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
  size,
  url,
  target = "_blank",
  disabled,
  is,
  renderIcon,
  imageURL,
  altText,
  onClick,
}: BaseButtonComponentProps) {
  const errors_imageSource = useSelector(
    (state: AppState) => state.languagePack.errors_imageSource,
  );
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
  const RenderIcon = renderIcon; // todo: enable passing custom icon
  const buttonKind = getButtonKind(kind) || "primary";
  const isStandard = is === "standard-button";

  const commonBtnProps = {
    className: cx("cds-aichat--button-item", className),
    disabled,
    href: url,
    kind: isStandard
      ? (buttonKind as BUTTON_KIND)
      : (buttonKind as CHAT_BUTTON_KIND),
    onClick,
    rel: url ? "noopener noreferrer" : undefined,
    size: isStandard ? (size as BUTTON_SIZE) : (size as CHAT_BUTTON_SIZE),
    target: linkTarget,
  };

  const body = (
    <>
      {renderIcon && <RenderIcon slot="icon" aria-label={text} />}
      {text}
    </>
  );

  if (is === "standard-button") {
    return <Button {...commonBtnProps}>{body}</Button>;
  }

  return <ChatButton {...commonBtnProps}>{body}</ChatButton>;
}

function getButtonKind(style: BUTTON_KIND | "LINK"): BUTTON_KIND {
  if (style == "LINK") {
    return BUTTON_KIND.GHOST;
  }
  return style;
}

export { BaseButtonItemComponent };
