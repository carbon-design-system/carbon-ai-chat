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
import CarbonTileElement from "@carbon/web-components/es/components/tile/tile.js";
import CarbonClickableTileElement from "@carbon/web-components/es/components/tile/clickable-tile.js";
import { withWebComponentBridge } from "./utils/withWebComponentBridge";

const Tile = withWebComponentBridge(
  createComponent({
    tagName: "cds-tile",
    elementClass: CarbonTileElement,
    react: React,
  }),
);

const ClickableTile = withWebComponentBridge(
  createComponent({
    tagName: "cds-clickable-tile",
    elementClass: CarbonClickableTileElement,
    react: React,
  }),
);

export default Tile;
export { Tile, ClickableTile };
