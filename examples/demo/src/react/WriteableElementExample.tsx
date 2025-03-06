/**
 *
 * IBM Confidential
 *
 * (C) Copyright IBM Corp. 2024
 *
 * The source code for this program is not published or otherwise
 * divested of its trade secrets, irrespective of what has been
 * deposited with the U. S. Copyright Office
 *
 * US Government Users Restricted Rights - Use, duplication or
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 *
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
      <p>
        Location: {location}. This is a writeable element with external styles.
        You can inject any custom content here. You are not constrained by any
        height.
      </p>
      <p>Some content from parent state: {parentStateText}</p>
    </div>
  );
}

export { WriteableElementExample };
