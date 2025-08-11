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
import CarbonSkeletonText from "@carbon/web-components/es-custom/components/skeleton-text/skeleton-text.js";

const SkeletonText = createComponent({
  tagName: "cds-custom-skeleton-text",
  elementClass: CarbonSkeletonText,
  react: React,
});

export default SkeletonText;
