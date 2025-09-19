/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Adapt the TypeDoc search UI so it renders inside a Carbon modal.
 *
 * TypeDoc renders its search markup directly into the DOM and wires behavior through
 * `assets/search.js`. We could fork that script, but that would require tracking every
 * upstream change to the search controller. Instead we let TypeDoc bootstrap normally,
 * move the generated nodes into the Carbon modal, and keep the original event wiring.
 * This keeps maintenance low while still letting the Carbon UI shell provide the
 * surrounding experience.
 */

(function () {
  "use strict";

  // Carbon integration: move the bundled TypeDoc search template into our modal.
  function moveSearchToModal() {
    const carbonModal = document.querySelector("#carbon-search-modal");
    const carbonSearchContent = document.querySelector(
      "#carbon-search-content",
    );
    const typedocSearch = document.querySelector("#tsd-search");

    if (!carbonModal || !carbonSearchContent || !typedocSearch) {
      setTimeout(moveSearchToModal, 100);
      return;
    }

    const searchInput = typedocSearch.querySelector("#tsd-search-input");
    const searchResults = typedocSearch.querySelector("#tsd-search-results");
    const searchStatus = typedocSearch.querySelector("#tsd-search-status");

    if (!searchInput || !searchResults || !searchStatus) {
      setTimeout(moveSearchToModal, 100);
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "tsd-search-wrapper";
    wrapper.style.padding = "var(--cds-spacing-05, 1rem) 0";

    wrapper.appendChild(searchInput);
    wrapper.appendChild(searchResults);
    wrapper.appendChild(searchStatus);

    carbonSearchContent.innerHTML = "";
    carbonSearchContent.appendChild(wrapper);

    typedocSearch.style.display = "none";
    typedocSearch.setAttribute("aria-hidden", "true");
  }

  // Carbon integration: mirror TypeDoc's trigger but target the Carbon modal element.
  function openSearchModal() {
    const carbonModal = document.querySelector("#carbon-search-modal");
    const searchInput = document.querySelector(
      "#carbon-search-content #tsd-search-input",
    );

    if (carbonModal) {
      carbonModal.setAttribute("open", "");
      setTimeout(() => {
        searchInput?.focus();
      }, 100);
    }
  }

  // Carbon integration: close the modal when the Carbon shell emits the close event.
  function closeSearchModal() {
    const carbonModal = document.querySelector("#carbon-search-modal");
    if (carbonModal) {
      carbonModal.removeAttribute("open");
    }
  }

  // Carbon integration: replace TypeDoc's inline trigger with the Carbon header button.
  function setupSearchInteractions() {
    const searchTrigger = document.querySelector("#carbon-search-trigger");
    const carbonModal = document.querySelector("#carbon-search-modal");

    if (!searchTrigger || !carbonModal) {
      setTimeout(setupSearchInteractions, 100);
      return;
    }

    searchTrigger.addEventListener("click", (event) => {
      event.preventDefault();
      openSearchModal();
    });

    carbonModal.addEventListener("cds-modal-closed", () => {
      closeSearchModal();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && carbonModal.hasAttribute("open")) {
        closeSearchModal();
      }
    });

    const originalTrigger = document.querySelector("#tsd-search-trigger");
    if (originalTrigger) {
      originalTrigger.style.display = "none";
    }
  }

  // Copied behavior: TypeDoc waits for its search component to bootstrap before wiring listeners.
  function waitForTypeDocSearchInitialization() {
    const searchInput = document.querySelector("#tsd-search-input");
    const searchTrigger = document.querySelector("#tsd-search-trigger");

    if (!searchInput || !searchTrigger) {
      setTimeout(waitForTypeDocSearchInitialization, 100);
      return;
    }

    try {
      const testEvent = new Event("input", { bubbles: true });
      searchInput.dispatchEvent(testEvent);
      moveSearchToModal();
      setupSearchInteractions();
    } catch (error) {
      console.log("TypeDoc search not fully initialized, retrying...", error);
      setTimeout(waitForTypeDocSearchInitialization, 100);
    }
  }

  // Carbon integration: delay start until DOM ready, matching TypeDoc's lazy load expectations.
  function initializeSearchModal() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        setTimeout(waitForTypeDocSearchInitialization, 500);
      });
    } else {
      setTimeout(waitForTypeDocSearchInitialization, 500);
    }
  }

  initializeSearchModal();
})();
