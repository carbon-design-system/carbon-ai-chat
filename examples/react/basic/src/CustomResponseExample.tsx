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

import "./CustomResponseStyles.css";

import React, { useEffect, useState } from "react";

interface CustomResponseExampleData {
  type: string;
  text: string;
}

interface CustomResponseExampleProps {
  data: CustomResponseExampleData;
}

function CustomResponseExample({ data }: CustomResponseExampleProps) {
  const [timestamp, setTimestamp] = useState(0);
  useEffect(() => {
    setInterval(() => {
      setTimestamp(Date.now());
    }, 1000);
  }, []);
  return (
    <div className="external">
      This is a user_defined response type with external styles. The following
      is some text passed along for use by the back-end: {data.text}. And here
      is a value being set by state: {timestamp}.
    </div>
  );
}

export { CustomResponseExample };
