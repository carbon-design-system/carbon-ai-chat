/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "./WorkspaceExample.css"; // Assuming styles are in a separate CSS file

import React from "react";

interface WorkspaceExampleProps {
  location: string;
  parentStateText: string;
}

function WorkspaceExample({
  location,
  parentStateText,
}: WorkspaceExampleProps) {
  return (
    <div className="writeable-element-external">
      <p>
        Location: {location}. This is a writeable element with external styles.
        You can inject any custom content here. It is constrained by height,
        which matches the height of the chat shell.
      </p>
      <p>Some content from parent state: {parentStateText}</p>
    </div>
  );
}

export { WorkspaceExample };
