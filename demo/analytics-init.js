/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

window._ibmAnalytics = {
  settings: {
    name: "CarbonAIChatDemo",
    isSpa: true,
    tealiumProfileName: "ibm-web-app",
  },
  onLoad: [["ibmStats.pageview", []]],
};
window.digitalData = {
  page: {
    pageInfo: {
      ibm: {
        siteId: "IBM_" + window._ibmAnalytics.settings.name,
      },
    },
    category: {
      primaryCategory: "PC100",
    },
  },
};
