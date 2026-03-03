/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

import { HasDisplayOverride } from "../../../../types/utilities/HasDisplayOverride";
import { LocalMessageItem } from "../../../../types/messaging/LocalMessageItem";
import { IFramePreviewCard } from "./IFramePreviewCard";
import { InlineIFrame } from "./InlineIFrame";
import {
  IFrameItem,
  IFrameItemDisplayOption,
} from "../../../../types/messaging/Messages";

interface IFrameMessageProps extends HasDisplayOverride {
  /**
   * The local message for the iframe response type.
   */
  localMessage: LocalMessageItem<IFrameItem>;
}

function IFrameMessage({ localMessage, displayOverride }: IFrameMessageProps) {
  const { item } = localMessage;
  const itemDisplay = item.display;

  // Render an inline iframe if it was configured to do so or it's being rendered in a card.
  if (
    itemDisplay === IFrameItemDisplayOption.INLINE ||
    displayOverride === IFrameItemDisplayOption.INLINE
  ) {
    // The key prop is important since it causes the IFrame to re-mount when the source changes.
    return <InlineIFrame key={item.source} messageItem={item} />;
  }

  return <IFramePreviewCard messageItem={item} />;
}

export { IFrameMessage };
