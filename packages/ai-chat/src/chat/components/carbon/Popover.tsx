/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createComponent } from "@lit/react";
import React from "react";

import CDSPopover from "@carbon/web-components/es/components/popover/popover.js";
import CDSPopoverContent from "@carbon/web-components/es/components/popover/popover-content.js";

export { POPOVER_ALIGNMENT } from "@carbon/web-components/es/components/popover/defs.js";

const Popover = createComponent({
  tagName: "cds-popover",
  elementClass: CDSPopover,
  react: React,
  events: {
    onCdsPopoverClosed: "cds-popover-closed",
    onCdsPopoverBeingClosed: "cds-popover-beingclosed",
  },
});

const PopoverContent = createComponent({
  tagName: "cds-popover-content",
  elementClass: CDSPopoverContent,
  react: React,
});

export { Popover, PopoverContent };
export default Popover;
