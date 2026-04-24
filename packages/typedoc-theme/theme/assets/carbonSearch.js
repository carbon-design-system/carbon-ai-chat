/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/* global lunr */

/**
 * Replace TypeDoc's search controller so the stock search experience lives inside our Carbon modal.
 *
 * TypeDoc still emits the search markup, seeds `window.searchData`, and loads Lunr via its bundled
 * `assets/search.js`. Rather than patch that script, we define our own controller that consumes the
 * generated data and DOM, moves the search nodes into the Carbon modal, and wires the behavior back up.
 * Core search logic (index loading, result rendering) mirrors the upstream implementation; sections marked
 * "Carbon integration" cover the modal-specific UX such as visibility toggles and shortcut handling.
 */

class CarbonSearch {
  constructor() {
    this.searchData = null;
    this.searchIndex = null;
    this.modal = null;
    this.input = null;
    this.results = null;
    this.status = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    if (typeof lunr === "undefined") {
      console.log("Waiting for Lunr.js to load...");
      setTimeout(() => this.initialize(), 100);
      return;
    }

    this.setupElements();
    await this.loadSearchData();
    this.setupEventListeners();

    this.initialized = true;
    console.log("Carbon search initialized successfully");
  }

  // Carbon integration: pull the TypeDoc search nodes into the modal shell.
  setupElements() {
    this.modal = document.querySelector("#carbon-search-modal");
    this.input = document.querySelector(
      "#carbon-search-content #tsd-search-input",
    );
    this.results = document.querySelector(
      "#carbon-search-content #tsd-search-results",
    );
    this.status = document.querySelector(
      "#carbon-search-content #tsd-search-status",
    );

    if (!this.input || !this.results || !this.status) {
      throw new Error(
        "Search elements not found - ensure carbonSearchModal.js has run first",
      );
    }
  }

  async loadSearchData() {
    if (!window.searchData) {
      this.updateStatus("Search index not available");
      return;
    }

    try {
      const response = await this.fetchSearchData(window.searchData);
      this.searchData = response;
      this.searchIndex = lunr.Index.load(response.index);

      this.updateStatus("");
      console.log("Search data loaded successfully");
    } catch (error) {
      console.error("Failed to load search data:", error);
      this.updateStatus("Failed to load search index");
    }
  }

  async fetchSearchData(searchDataUrl) {
    if (typeof searchDataUrl === "object") {
      return searchDataUrl;
    }

    if (typeof searchDataUrl === "string") {
      const response = await fetch(searchDataUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch search data: ${response.statusText}`);
      }
      return response.json();
    }

    throw new Error("Invalid search data format");
  }

  // Carbon integration: keyboard shortcuts and modal friendly listeners.
  setupEventListeners() {
    this.input.addEventListener(
      "input",
      this.debounce(() => {
        this.performSearch(this.input.value.trim());
      }, 200),
    );

    this.input.addEventListener("keydown", (event) => {
      this.handleKeyNavigation(event);
    });

    this.input.addEventListener("input", () => {
      this.clearSelection();
    });

    document.addEventListener("keydown", (event) => {
      const isShortcut =
        (event.ctrlKey && event.key === "k") ||
        (!event.ctrlKey &&
          !event.metaKey &&
          !event.altKey &&
          event.key === "/" &&
          !this.isInputFocused());

      if (isShortcut) {
        event.preventDefault();
        this.openSearch();
      }
    });
  }

  performSearch(query) {
    if (!this.searchIndex || !this.searchData) {
      return;
    }

    this.results.innerHTML = "";
    this.updateStatus("");

    if (!query) {
      return;
    }

    try {
      const lunrQuery = query
        .split(" ")
        .map((term) => (term.length ? `*${term}*` : ""))
        .join(" ");

      const searchResults = this.searchIndex.search(lunrQuery);

      const filteredResults = searchResults
        .filter(({ ref }) => {
          const row = this.searchData.rows[Number(ref)];
          return !row.classes || !this.isFiltered(row.classes);
        })
        .map((result) => ({
          ...result,
          row: this.searchData.rows[Number(result.ref)],
        }));

      this.displayResults(filteredResults, query);
    } catch (error) {
      console.error("Search error:", error);
      this.updateStatus("Search error occurred");
    }
  }

  displayResults(results, query) {
    if (results.length === 0) {
      this.updateStatus(
        `No results found for "<strong>${this.escapeHtml(query)}</strong>"`,
      );
      return;
    }

    results.sort((a, b) => {
      const aExact = a.row.name.toLowerCase().startsWith(query.toLowerCase())
        ? 10
        : 1;
      const bExact = b.row.name.toLowerCase().startsWith(query.toLowerCase())
        ? 10
        : 1;
      return b.score * bExact - a.score * aExact;
    });

    const maxResults = Math.min(10, results.length);

    for (let index = 0; index < maxResults; index += 1) {
      const { row } = results[index];
      const resultElement = this.createResultElement(row, query, index);
      this.results.appendChild(resultElement);
    }
  }

  createResultElement(row, query, index) {
    const listItem = document.createElement("li");
    listItem.id = `carbon-search-result-${index}`;
    listItem.role = "option";
    listItem.setAttribute("aria-selected", "false");
    listItem.classList.value = row.classes || "";

    const anchor = document.createElement("a");
    anchor.tabIndex = -1;
    anchor.href = this.getBaseUrl() + row.url;

    const icon = document.createElement("div");
    icon.innerHTML = this.getKindIcon(row.kind, row.icon);

    const textSpan = document.createElement("span");
    textSpan.className = "text";
    textSpan.innerHTML = this.highlightText(row.name, query);

    if (row.parent) {
      const parentSpan = document.createElement("span");
      parentSpan.className = "parent";
      parentSpan.innerHTML = `${this.highlightText(row.parent, query)}.`;
      textSpan.insertBefore(parentSpan, textSpan.firstChild);
    }

    anchor.appendChild(icon);
    anchor.appendChild(textSpan);
    listItem.appendChild(anchor);

    return listItem;
  }

  getKindIcon(kind, icon) {
    const kindName = window.translations?.[`kind_${kind}`] || kind;
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="tsd-kind-icon" aria-label="${this.escapeHtml(kindName)}"><use href="#icon-${icon || kind}"></use></svg>`;
  }

  highlightText(text, query) {
    if (!query) {
      return this.escapeHtml(text);
    }

    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const segments = [];
    let lastIndex = 0;
    let index = lowerText.indexOf(lowerQuery);

    while (index !== -1) {
      if (index > lastIndex) {
        segments.push(this.escapeHtml(text.substring(lastIndex, index)));
      }

      segments.push(
        `<mark>${this.escapeHtml(text.substring(index, index + query.length))}</mark>`,
      );

      lastIndex = index + query.length;
      index = lowerText.indexOf(lowerQuery, lastIndex);
    }

    if (lastIndex < text.length) {
      segments.push(this.escapeHtml(text.substring(lastIndex)));
    }

    return segments.join("");
  }

  handleKeyNavigation(event) {
    const items = this.results.querySelectorAll('li[role="option"]');
    if (items.length === 0) {
      return;
    }

    const activeItem = this.results.querySelector('li[aria-selected="true"]');
    let newIndex = -1;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        newIndex = activeItem
          ? Math.min(
              Array.from(items).indexOf(activeItem) + 1,
              items.length - 1,
            )
          : 0;
        break;
      case "ArrowUp":
        event.preventDefault();
        newIndex = activeItem
          ? Math.max(Array.from(items).indexOf(activeItem) - 1, 0)
          : items.length - 1;
        break;
      case "Enter":
        if (activeItem) {
          event.preventDefault();
          activeItem.querySelector("a")?.click();
        }
        break;
      case "Escape":
        this.closeSearch();
        break;
      default:
        break;
    }

    if (newIndex >= 0) {
      this.selectItem(items[newIndex]);
    }
  }

  selectItem(item) {
    this.results
      .querySelectorAll('li[aria-selected="true"]')
      .forEach((listItem) => listItem.setAttribute("aria-selected", "false"));

    item.setAttribute("aria-selected", "true");
    item.scrollIntoView({ behavior: "smooth", block: "nearest" });
    this.input.setAttribute("aria-activedescendant", item.id);
  }

  clearSelection() {
    this.results
      .querySelectorAll('li[aria-selected="true"]')
      .forEach((listItem) => listItem.setAttribute("aria-selected", "false"));
    this.input.setAttribute("aria-activedescendant", "");
  }

  // Carbon integration: open Carbon modal before focusing the input.
  openSearch() {
    if (this.modal) {
      this.modal.setAttribute("open", "");
      setTimeout(() => {
        this.input?.focus();
        this.input?.select();
      }, 100);
    }
  }

  // Carbon integration: close modal when finished.
  closeSearch() {
    if (this.modal) {
      this.modal.removeAttribute("open");
    }
  }

  updateStatus(message) {
    if (!this.status) {
      return;
    }

    this.status.innerHTML = message ? `<div>${message}</div>` : "";
  }

  getBaseUrl() {
    let base = document.documentElement.dataset.base || "./";
    if (!base.endsWith("/")) {
      base += "/";
    }
    return base;
  }

  isFiltered(_classes) {
    return false;
  }

  // Carbon integration: guard shortcuts when focus is in another input element.
  isInputFocused() {
    const active = document.activeElement;
    if (!active) {
      return false;
    }

    if (active.isContentEditable) {
      return true;
    }

    if (active.tagName === "TEXTAREA" || active.tagName === "SEARCH") {
      return true;
    }

    if (active.tagName === "INPUT") {
      const disallowed = [
        "button",
        "checkbox",
        "file",
        "hidden",
        "image",
        "radio",
        "range",
        "reset",
        "submit",
      ];
      return !disallowed.includes(active.type);
    }

    return false;
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  debounce(func, wait) {
    let timeout;
    return function debounced(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

function initializeCarbonSearch() {
  const search = new CarbonSearch();

  const waitForModal = () => {
    if (document.querySelector("#carbon-search-modal")) {
      void search.initialize();
    } else {
      setTimeout(waitForModal, 100);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", waitForModal);
  } else {
    waitForModal();
  }

  window.carbonSearch = search;
}

initializeCarbonSearch();
