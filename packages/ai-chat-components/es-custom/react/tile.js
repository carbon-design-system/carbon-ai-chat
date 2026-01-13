/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent } from '@lit/react';
import React from 'react';
import CDSTile from '@carbon/web-components/es-custom/components/tile/tile.js';
import CarbonClickableTileElement from '@carbon/web-components/es-custom/components/tile/clickable-tile.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
const Tile = withWebComponentBridge(createComponent({
    tagName: "cds-custom-tile",
    elementClass: CDSTile,
    react: React,
}));
const ClickableTile = withWebComponentBridge(createComponent({
    tagName: "cds-custom-clickable-tile",
    elementClass: CarbonClickableTileElement,
    react: React,
}));

export { ClickableTile, Tile, Tile as default };
//# sourceMappingURL=tile.js.map
