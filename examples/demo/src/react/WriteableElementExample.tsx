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
}

function WriteableElementExample({ location }: WriteableElementExampleProps) {
  return (
    <div className="writeable-element-external">
      Location: {location}. This is a writeable element with external styles.
      You can inject any custom content here. You are not constrained by any
      height.
    </div>
  );
}

export { WriteableElementExample };
