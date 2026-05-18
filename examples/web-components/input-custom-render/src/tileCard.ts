/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Shared tile-card DOM builder for the input-custom-render example.
 *
 * Demonstrates: building a self-contained Carbon `<cds-tile>` element. Both
 * the in-editor node view (`tileChipNode.ts`) and the sent-bubble renderer
 * (`renderTileChip.ts`) bridge their content into the page's light DOM, so
 * the card is built with a self-styled Carbon web component plus inline
 * styles — it carries its own look wherever it is mounted.
 *
 * APIs exercised:
 *   - `<cds-tile>` from `@carbon/web-components`
 *
 * Start reading at: the `buildTileCard` function below.
 */

// Registers the <cds-tile> custom element.
import "@carbon/web-components/es/components/tile/index.js";

/** Builds a Carbon `<cds-tile>` showing the tile's label + description. */
function buildTileCard(label: string, description: string): HTMLElement {
  const tile = document.createElement("cds-tile");
  tile.className = "tile-chip";

  const labelEl = document.createElement("strong");
  labelEl.style.display = "block";
  labelEl.textContent = label;

  const descEl = document.createElement("span");
  descEl.style.display = "block";
  descEl.style.marginBlockStart = "0.25rem";
  descEl.style.color = "#525252";
  descEl.style.fontSize = "0.875rem";
  descEl.textContent = description;

  tile.append(labelEl, descEl);
  return tile;
}

export { buildTileCard };
