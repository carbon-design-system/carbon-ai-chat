/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Replace "Experimental" text with "Preview" in TypeDoc tags
 * and apply Carbon Design System styling
 */
(function () {
  "use strict";

  function replaceExperimentalTags() {
    // Find all .tsd-tag elements
    const tags = document.querySelectorAll(".tsd-tag, code.tsd-tag");

    tags.forEach((tag) => {
      if (tag.textContent.trim() === "Experimental") {
        // Replace the text content
        tag.textContent = "Preview";

        // Add data attribute for CSS targeting
        tag.setAttribute("data-tag-type", "experimental");

        // Add class for additional styling
        tag.classList.add("tsd-tag--experimental");
      }
    });
  }

  // Run when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", replaceExperimentalTags);
  } else {
    replaceExperimentalTags();
  }

  // Also run after a short delay to catch any dynamically loaded content
  setTimeout(replaceExperimentalTags, 100);
})();
