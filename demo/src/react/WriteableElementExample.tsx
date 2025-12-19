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
  return (
    <div className="writeable-element-external">
      Location: {location}. This is a writeable element with external styles.
      You can inject any custom content here. You are not constrained by any
      height.
      <br />
      Here is a property set by the parent application: {parentStateText}
    </div>
  );
}

export { WriteableElementExample };
