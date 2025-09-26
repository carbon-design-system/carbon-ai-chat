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
import CDSAIChatTileContainer from "../components/tile-container/src/tile-container.js";

const TileContainer = createComponent({
  tagName: "cds-aichat-tile-container",
  elementClass: CDSAIChatTileContainer,
  react: React,
});

export default TileContainer;
