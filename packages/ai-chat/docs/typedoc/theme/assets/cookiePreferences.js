/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * IBM Cookie Preferences and Analytics Setup
 *
 * Sets up the IBM DDO and IBM commons script needed for the cookie
 * preferences to appear in the Carbon AI Chat documentation.
 */

// Initialize IBM Analytics configuration
window._ibmAnalytics = {
  settings: {
    name: "CarbonAIChatDocs",
    isSpa: true,
    tealiumProfileName: "ibm-web-app",
  },
  onLoad: [["ibmStats.pageview", []]],
};

// Set up digital data for IBM tracking
window.digitalData = {
  page: {
    pageInfo: {
      ibm: {
        siteId: `IBM_${window._ibmAnalytics.settings.name}`,
      },
    },
    category: {
      primaryCategory: "PC100",
    },
  },
};

// Load IBM common stats script
(function () {
  const script = document.createElement("script");
  script.src = "//1.www.s81c.com/common/stats/ibm-common.js";
  script.type = "text/javascript";
  script.async = true;
  document.head.appendChild(script);
})();
