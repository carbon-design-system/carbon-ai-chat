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

// We need to bring in the loading icon for the "small" variant.
// In general, since the `index.js` paths in the web components packages don't have exports, we need to investigate
// and understand what other side effects the component we are actually importing have.
import "@carbon/web-components/es/components/loading/loading-icon.js";

// Export the actual class for the component that will *directly* be wrapped with React.
import CarbonLoadingElement from "@carbon/web-components/es/components/loading/loading.js";

const Loading = createComponent({
  tagName: "cds-loading",
  elementClass: CarbonLoadingElement,
  react: React,
});

export default Loading;
