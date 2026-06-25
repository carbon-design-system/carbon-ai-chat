/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Stops the Carbon UI Shell side nav from stealing focus when a navigation item
 * is clicked on wide screens.
 *
 * `cds-side-nav` runs in `collapse-mode="responsive"`. In that mode it expands
 * itself on `focusin` and then moves focus to the first navigation item. On
 * wide screens (at or above the 66rem side-nav breakpoint) the side nav is
 * already shown as a persistent sidebar, so that expand-and-focus is pure side
 * effect: clicking a link focuses it, the side nav expands, and focus jumps to
 * the first item ("Overview") mid-click. That scrolls the page to the top and
 * races the link's own navigation, so the first click appears to only scroll up
 * without changing pages and a second click is needed to navigate -- by then
 * the side nav is already expanded, so no focus move happens.
 *
 * Below the breakpoint the side nav is an off-canvas drawer and moving focus
 * into it when it opens is the desired behavior, so the focus handling is only
 * suppressed while the side nav is the persistent desktop sidebar.
 */
(function () {
  "use strict";

  // Carbon's side-nav responsive breakpoint. Above it the nav is a persistent
  // sidebar; below it the nav is an off-canvas drawer toggled by the header
  // menu button.
  const persistentSideNav = window.matchMedia("(min-width: 66rem)");

  // The navigable items. Focus is only intercepted when it originates from one
  // of these, so the version dropdown (also a child of the side nav) keeps its
  // own focus handling.
  const NAV_ITEM_TAGS = new Set([
    "CDS-SIDE-NAV-LINK",
    "CDS-SIDE-NAV-MENU",
    "CDS-SIDE-NAV-MENU-ITEM",
  ]);

  function isPersistentNavItemFocus(event) {
    if (!persistentSideNav.matches) {
      return false;
    }
    const path = event.composedPath();
    return (
      path.some((node) => node.nodeName === "CDS-SIDE-NAV") &&
      path.some((node) => NAV_ITEM_TAGS.has(node.nodeName))
    );
  }

  // Capture phase: run before `cds-side-nav`'s own focusin/focusout listeners
  // and stop the event from reaching them, so it never flips `expanded` and
  // moves focus to the first item.
  function suppressSideNavFocus(event) {
    if (isPersistentNavItemFocus(event)) {
      event.stopPropagation();
    }
  }

  document.addEventListener("focusin", suppressSideNavFocus, true);
  document.addEventListener("focusout", suppressSideNavFocus, true);
})();
