/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createComponent } from "@lit/react";
import React from "react";

// Export the actual class for the component that will *directly* be wrapped with React.
import CarbonAILabelElement from "@carbon/web-components/es/components/ai-label/ai-label.js";

const AILabel = createComponent({
  tagName: "cds-ai-label",
  elementClass: CarbonAILabelElement,
  react: React,
});

export default AILabel;
