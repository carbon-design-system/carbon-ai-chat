/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "./WriteableElementExample.css"; // Assuming styles are in a separate CSS file

import { Tooltip } from "@carbon/react";
import React from "react";
interface WriteableElementExampleProps {
  location: string;
  parentStateText: string;
}

function WriteableElementExample({
  location,
  parentStateText,
}: WriteableElementExampleProps) {
  let classNames = "writeable-element-external";
  if (location === "aiTooltipAfterDescriptionElement") {
    classNames += " writeable-element-external--not-rounded";
  }

  // The header fixed actions and in-composer prompt-line slots sit inside tight
  // rows, so show a small green swatch that names the slot in a Carbon tooltip on
  // hover/focus rather than a text block. The prompt-line swatches match the 32px
  // input controls; the header uses smaller (24px) icons, so its swatch is 24px.
  if (
    location === "headerFixedActionsElement" ||
    location === "promptLineActionsEnd" ||
    location === "promptLineSendButtonStart"
  ) {
    let swatchClass = "writeable-element-external--swatch";
    // The header swatch sits at the top of the chat, so prefer pointing its
    // tooltip down into the chat body; the prompt-line swatches sit at the
    // bottom, so they prefer pointing up into the message area. `autoAlign`
    // (floating-ui) then flips/shifts from that preferred side to stay inside the
    // viewport — needed for the sidebar/float layouts and RTL, where a fixed side
    // would clip against the chat or page edge.
    let swatchAlign: "top" | "bottom" = "top";
    if (location === "headerFixedActionsElement") {
      swatchClass += " writeable-element-external--swatch-header";
      swatchAlign = "bottom";
    }
    return (
      // `display: inline-block` on Carbon's tooltip trigger wrapper would add
      // font-descender space below the swatch, making the slot content taller
      // than the swatch and pushing it off-center. The class flips the wrapper to
      // a flex box so the slot content is exactly the swatch height.
      <Tooltip
        className="writeable-element-external--swatch-tooltip"
        label={location}
        align={swatchAlign}
        autoAlign
      >
        <button type="button" className={swatchClass} />
      </Tooltip>
    );
  }

  return (
    <div className={classNames}>
      Location: {location}. Parent prop: {parentStateText}
    </div>
  );
}

export { WriteableElementExample };
