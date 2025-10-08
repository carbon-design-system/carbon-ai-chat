/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

(function () {
  "use strict";

  // Determine the current version and type from the URL
  function getCurrentVersionInfo() {
    const path = window.location.pathname;

    // Check if we're on a tag (latest/next)
    const tagMatch = path.match(/\/tag\/(latest|next)\//);
    if (tagMatch) {
      return { type: "tag", value: tagMatch[1] };
    }

    // Check if we're on a versioned path
    const versionMatch = path.match(/\/version\/(v[\d.]+(?:-rc\.\d+)?)\//);
    if (versionMatch) {
      return { type: "version", value: versionMatch[1] };
    }

    // Check if we're on localhost (with or without port)
    const hostname = window.location.hostname;
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0"
    ) {
      return { type: "local", value: "local" };
    }

    // Default to latest if we can't determine
    return { type: "tag", value: "latest" };
  }

  // Get the base path for a given version
  function getVersionPath(versionInfo) {
    if (versionInfo.type === "tag") {
      return `/tag/${versionInfo.value}/docs/documents/Overview.html`;
    } else {
      return `/version/${versionInfo.value}/docs/documents/Overview.html`;
    }
  }

  // Get the path to versions.js based on current location
  function getVersionsPath() {
    const currentInfo = getCurrentVersionInfo();

    // If we're on localhost, fetch from TypeDoc root
    // We need to find the base path from the current location
    if (currentInfo.type === "local") {
      // Get the data-base attribute from the html element which tells us the path to root
      const htmlElement = document.documentElement;
      const basePath = htmlElement.getAttribute("data-base") || "./";
      return basePath + "versions.js";
    }

    // For deployed sites, always fetch from the canonical location
    return "https://chat.carbondesignsystem.com/versions.js";
  }

  // Fetch and populate the version dropdown
  async function initVersionDropdown() {
    try {
      const versionsPath = getVersionsPath();
      const response = await fetch(versionsPath);

      if (!response.ok) {
        console.warn("Failed to fetch versions.js from", versionsPath);
        return;
      }

      const text = await response.text();

      // Extract the AI_CHAT_VERSIONS array from the file
      const match = text.match(/export const AI_CHAT_VERSIONS = (\[.*?\]);/s);
      if (!match) {
        console.warn("Failed to parse versions.js");
        return;
      }

      // Replace single quotes with double quotes for valid JSON
      const arrayString = match[1].replace(/'/g, '"');
      const versions = JSON.parse(arrayString);

      // Get current version info to determine which option should be selected
      const currentInfo = getCurrentVersionInfo();

      // Build the dropdown options - start with an empty array
      let options = [];

      // Add "Pre-release" option for next tag
      options.push({
        label: "Pre-release",
        value: "tag:next",
        href: `https://chat.carbondesignsystem.com${getVersionPath({ type: "tag", value: "next" })}`,
        selected: currentInfo.type === "tag" && currentInfo.value === "next",
      });

      // Add all version options from the array
      // If current version is "latest" tag, select the first version in the array
      const isLatest =
        currentInfo.type === "tag" && currentInfo.value === "latest";
      options = options.concat(
        versions.map(function (version, index) {
          const isFirstVersion = index === 0;
          const selected =
            (currentInfo.type === "version" && currentInfo.value === version) ||
            (isLatest && isFirstVersion);
          return {
            label: version,
            value: version,
            href: `https://chat.carbondesignsystem.com${getVersionPath({ type: "version", value: version })}`,
            selected: selected,
          };
        }),
      );

      // Add "Local" option if we're on localhost
      if (currentInfo.type === "local") {
        options.unshift({
          label: "Local",
          value: "local",
          href: window.location.href,
          selected: true,
        });
      }

      // Determine the selected value
      let selectedValue =
        options.find((opt) => opt.selected)?.value ||
        options[0]?.value ||
        "local";

      // Find the dropdown element
      const dropdown = document.getElementById("versions-dropdown");
      if (!dropdown) {
        console.warn("Versions dropdown element not found");
        return;
      }

      // Set the selected value
      dropdown.value = selectedValue;

      // Populate the dropdown with items
      options.forEach(function (option) {
        const item = document.createElement("cds-dropdown-item");
        item.setAttribute("value", option.value);
        item.textContent = option.label;
        item.dataset.href = option.href;
        dropdown.appendChild(item);
      });

      // Add event listener for selection changes
      dropdown.addEventListener("cds-dropdown-selected", function (event) {
        const selectedValue = event.detail?.item?.value ?? event.detail?.value;
        const selectedOption = options.find(
          (opt) => opt.value === selectedValue,
        );
        if (selectedOption && selectedOption.href) {
          window.location.href = selectedOption.href;
        }
      });
    } catch (error) {
      console.error("Error initializing version dropdown:", error);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initVersionDropdown);
  } else {
    initVersionDropdown();
  }
})();
