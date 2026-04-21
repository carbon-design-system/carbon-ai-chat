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

// Export the actual class for the component that will *directly* be wrapped with React.
import CDSAICarousel from "../components/carousel/src/carousel";
import { withWebComponentBridge } from "./utils/withWebComponentBridge";

const Carousel = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-carousel",
    elementClass: CDSAICarousel,
    react: React,
    events: {
      onChange: "cds-aichat-carousel-onchange",
    },
  }),
);

export { Carousel };
export default Carousel;
