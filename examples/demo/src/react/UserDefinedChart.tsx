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

import { ChatInstance } from "@carbon/ai-chat";
import CLABSChart from "@carbon-labs/ai-chat/es/components/chartElement/chartElement.js";
import { createComponent } from "@lit/react";
import React, { useEffect } from "react";

const LabsChart = createComponent({
  tagName: "clabs-chat-chart",
  elementClass: CLABSChart,
  react: React,
});

interface ChartProps {
  content: string;
}

function Chart({ content }: ChartProps) {
  return (
    <LabsChart
      content={content}
      disableOptions
      disableFullscreen
      disableEditor
      disableExport
      disableCodeInspector
      debugMode={false}
    />
  );
}

export { Chart };
