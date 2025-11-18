/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import Launch16 from "@carbon/icons/es/launch/16.js";
import Link from "../../../components/carbon/Link";
import { carbonIconToReact } from "../../../utils/carbonIcon";
import React from "react";

import { LocalMessageItem } from "../../../../types/messaging/LocalMessageItem";
import { ButtonItem } from "../../../../types/messaging/Messages";
import { BaseButtonItemComponent } from "./BaseButtonItemComponent";

const LaunchIcon = carbonIconToReact(Launch16);

/**
 * This component is for a button response type where the button_type is "url". Clicking this button will take the
 * user to the provided url. A target location can also be provided.
 */
function ButtonItemURLComponent({
  localMessageItem,
}: {
  localMessageItem: LocalMessageItem<ButtonItem>;
}) {
  const { image_url, alt_text, url, target, label, kind, size, is } =
    localMessageItem.item;

  // If no image url is provided and should is a normal link, then render a carbon link.
  if (!image_url && kind === "LINK") {
    return (
      <div className="cds-aichat--button-item">
        <Link
          className="cds-aichat--widget__break-word"
          href={url}
          target={target}
          rel="noopener noreferrer"
        >
          <LaunchIcon slot="icon" className="icon" aria-label="Launch" />
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
      size={size}
      is={is}
      url={url}
      target={target}
      renderIcon={LaunchIcon}
    />
  );
}

export { ButtonItemURLComponent };
