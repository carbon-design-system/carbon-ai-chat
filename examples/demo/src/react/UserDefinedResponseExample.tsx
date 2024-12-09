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

import "./UserDefinedResponseStyles.css";

import React, { useEffect, useState } from "react";

interface UserDefinedExampleProps {
  text: string;
}

function UserDefinedResponseExample({ text }: UserDefinedExampleProps) {
  const [timestamp, setTimestamp] = useState(0);
  useEffect(() => {
    setInterval(() => {
      setTimestamp(Date.now());
    }, 1000);
  }, []);
  return (
    <div className="external">
      This is a user_defined response type with external styles. The following
      is some text passed along for use by the back-end: {text}. And here is a
      value being set by state: {timestamp}.
    </div>
  );
}

export { UserDefinedResponseExample };
