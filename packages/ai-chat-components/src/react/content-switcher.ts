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
import CarbonContentSwitcherElement from "@carbon/web-components/es/components/content-switcher/content-switcher.js";
import CarbonContentSwitcherItemElement from "@carbon/web-components/es/components/content-switcher/content-switcher-item.js";
import { withWebComponentBridge } from "./utils/withWebComponentBridge";

const ContentSwitcher = withWebComponentBridge(
  createComponent({
    tagName: "cds-content-switcher",
    elementClass: CarbonContentSwitcherElement,
    react: React,
    events: {
      onSelected: "cds-content-switcher-selected",
    },
  }),
);
const ContentSwitcherItem = withWebComponentBridge(
  createComponent({
    tagName: "cds-content-switcher-item",
    elementClass: CarbonContentSwitcherItemElement,
    react: React,
  }),
);

export default ContentSwitcher;
export { ContentSwitcher, ContentSwitcherItem };
