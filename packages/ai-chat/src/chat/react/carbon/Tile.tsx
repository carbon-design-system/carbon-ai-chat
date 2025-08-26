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
import CDSAIChatTile from "@carbon/ai-chat-components/es/components/tile/tile.js"
import CarbonClickableTileElement from "@carbon/web-components/es-custom/components/tile/clickable-tile.js";

const Tile = createComponent({
  tagName: "cds-aichat-tile",
  elementClass: CDSAIChatTile,
  react: React,
});

const ClickableTile = createComponent({
  tagName: "cds-custom-clickable-tile",
  elementClass: CarbonClickableTileElement,
  react: React,
});

export { Tile, ClickableTile };
export default Tile;
