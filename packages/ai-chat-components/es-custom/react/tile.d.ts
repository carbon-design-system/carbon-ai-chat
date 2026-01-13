import React from "react";
import CarbonTileElement from "@carbon/web-components/es-custom/components/tile/tile.js";
import CarbonClickableTileElement from "@carbon/web-components/es-custom/components/tile/clickable-tile.js";
declare const Tile: React.ForwardRefExoticComponent<Omit<Record<string, unknown>, "ref"> & React.RefAttributes<CarbonTileElement>>;
declare const ClickableTile: React.ForwardRefExoticComponent<Omit<Record<string, unknown>, "ref"> & React.RefAttributes<CarbonClickableTileElement>>;
export default Tile;
export { Tile, ClickableTile };
