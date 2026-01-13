/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "./CustomResponseStyles.css";

import React, { useEffect, useState } from "react";

interface CustomResponseExampleData {
  type: string;
  text: string;
}

interface CustomResponseExampleProps {
  data: CustomResponseExampleData;
  isLatestMessage?: boolean;
  latestResponseId?: string;
}

function CustomResponseExample({
  data,
  isLatestMessage = false,
  latestResponseId,
}: CustomResponseExampleProps) {
  const [timestamp, setTimestamp] = useState(0);
  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimestamp(Date.now());
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="external">
      This is a user_defined response type with external styles. The following
      is some text passed along for use by the back-end: {data.text}. And here
      is a value being set by state: {timestamp}.
      <div>
        Latest response id: {latestResponseId ? latestResponseId : "none yet"}
      </div>
      <div>
        Is this the most recent message? {isLatestMessage ? "Yes" : "Nope"}
      </div>
    </div>
  );
}

export { CustomResponseExample };
