/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Redirect index.html to Overview page
 * This script automatically redirects users from the main index page to the Overview document
 */

// Check if we're on the index page and should redirect
if (
  window.location.pathname.endsWith("/index.html") ||
  (window.location.pathname.endsWith("/") &&
    !window.location.pathname.includes("/documents/")) ||
  (window.location.pathname.endsWith("/carbon-tsdocs") &&
    !window.location.search) ||
  (window.location.pathname.endsWith("/carbon-tsdocs/") &&
    !window.location.search)
) {
  // Redirect to Overview page
  window.location.replace("documents/Overview.html");
}
