/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "./UserDefinedResponseStyles.css";

import React, { useEffect, useState } from "react";

interface UserDefinedExampleProps {
  text: string;
  parentStateText: string;
}

function UserDefinedResponseExample({
  text,
  parentStateText,
}: UserDefinedExampleProps) {
  const [timestamp, setTimestamp] = useState(0);
  useEffect(() => {
    setInterval(() => {
      setTimestamp(Date.now());
    }, 1500);
  }, []);
  return (
    <div className="external">
      <p>
        This is a user_defined response type with external styles hosted inside
        its own slot.
      </p>
      <p>
        The following is some text passed along for use by the back-end: {text}.
      </p>
      <p>
        And here is a value being set by the parent container state:{" "}
        {parentStateText}.
      </p>
      <p>And here is a value being set by local state: {timestamp}.</p>
    </div>
  );
}

export { UserDefinedResponseExample };
