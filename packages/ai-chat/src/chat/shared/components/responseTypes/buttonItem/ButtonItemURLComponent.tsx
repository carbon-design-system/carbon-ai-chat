/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import Launch from "@carbon/icons-react/es/Launch.js";
import { Link } from "@carbon/react";
import React from "react";

import { LocalMessageItem } from "../../../../../types/messaging/LocalMessageItem";
import {
  ButtonItem,
  ButtonItemKind,
} from "../../../../../types/messaging/Messages";
import { BaseButtonItemComponent } from "./BaseButtonItemComponent";

/**
 * This component is for a button response type where the button_type is "url". Clicking this button will take the
 * user to the provided url. A target location can also be provided.
 */
function ButtonItemURLComponent({
  localMessageItem,
}: {
  localMessageItem: LocalMessageItem<ButtonItem>;
}) {
  const { image_url, alt_text, url, target, label, kind } =
    localMessageItem.item;

  // If no image url is provided and should is a normal link, then render a carbon link.
  if (!image_url && kind === ButtonItemKind.LINK) {
    return (
      <div className="WACButtonItem">
        <Link
          className="WACWidget__breakWord"
          href={url}
          target={target}
          rel="noopener noreferrer"
          renderIcon={Launch}
        >
          {label || url}
        </Link>
      </div>
    );
  }

  return (
    <BaseButtonItemComponent
      imageURL={image_url}
      altText={alt_text}
      label={label}
      kind={kind}
      url={url}
      target={target}
      renderIcon={Launch}
    />
  );
}

export { ButtonItemURLComponent };
