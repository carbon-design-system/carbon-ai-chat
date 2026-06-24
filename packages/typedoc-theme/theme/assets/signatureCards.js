/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Wrap each TypeDoc code block in a Carbon tile surface, so signatures and type
 * declarations are presented like the fenced code blocks produced by
 * markdownItCarbon.js. The target element is moved inside a `<div class="cds--tile">`.
 *
 * We use the `.cds--tile` CSS class from @carbon/styles (already loaded by the
 * theme) rather than the `<cds-tile>` web component on purpose: the published
 * `/tag/latest/` web component runs an `updated()` lifecycle that grabs the
 * first `<a>` in the tile and prepends two `<br>`s to it on every render, which
 * mangles the link-heavy signature markup. The plain CSS class gives the
 * identical surface with no JavaScript touching the slotted content.
 *
 * Targets:
 *   - div.tsd-signature      — the prominent member / preview signature boxes.
 *   - .tsd-type-declaration  — the "Type Declaration" blocks.
 *
 * `li.tsd-signature` (nested type-detail lists) is intentionally excluded so we
 * don't move an <li> out of its <ul> and break list semantics. Elements already
 * inside a tile are skipped so a type declaration nested in another doesn't
 * produce nested tiles.
 */
(function () {
  const SELECTOR =
    ".carbon-main-content div.tsd-signature, .carbon-main-content .tsd-type-declaration";

  function wrapInTiles() {
    // querySelectorAll returns document order, so outer elements wrap before
    // inner ones and the closest() guard skips anything already tiled.
    document.querySelectorAll(SELECTOR).forEach((el) => {
      // Guard against re-wrapping if this ever runs more than once.
      if (el.dataset.carbonTile !== undefined) {
        return;
      }
      // Skip elements already inside a tile (e.g. a type declaration nested in
      // one we just wrapped) so we don't create nested tiles.
      if (el.closest(".cds--tile")) {
        return;
      }
      el.dataset.carbonTile = "";

      const tile = document.createElement("div");
      // No theme class on the tile: it inherits the surrounding `.cds--g10`
      // layer context (see .carbon-main-content in the layout), so `.cds--tile`
      // paints g10's layer-01 (white). Forcing `cds--white` here would re-base
      // it to the white theme, whose layer-01 is gray.
      //
      // `carbon-signature-tile` lets carbonTheme.css drop the tile's default
      // min-block-size so it hugs the block. Fenced-code tiles keep their
      // default sizing.
      tile.className = "cds--tile carbon-signature-tile";

      // Insert the tile where the element is, then move the element into it.
      el.parentNode.insertBefore(tile, el);
      tile.appendChild(el);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wrapInTiles);
  } else {
    wrapInTiles();
  }
})();
