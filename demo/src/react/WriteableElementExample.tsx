/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "./WriteableElementExample.css"; // Assuming styles are in a separate CSS file

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
  return (
    <div className={classNames}>
      Location: {location}. Parent prop: {parentStateText}
    </div>
  );
}

export { WriteableElementExample };
