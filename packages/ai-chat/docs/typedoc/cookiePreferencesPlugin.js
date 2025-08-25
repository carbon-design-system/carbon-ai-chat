/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { JSX } from "typedoc";

/** @type {import("typedoc").PluginHost} */
export function load(app) {
  /**
   * Adds the IBM DDO and IBM commons script needed for the cookie
   * preferences to appear
   */
  app.renderer.hooks.on("head.end", () =>
    JSX.createElement(
      "fragment",
      null,
      JSX.createElement(
        "script",
        { type: "text/javascript" },
        JSX.Raw({
          html: `
            window._ibmAnalytics = {
              settings: {
                name: 'CarbonAIChatDocs',
                isSpa: true,
                tealiumProfileName: 'ibm-web-app',
              },
              onLoad: [['ibmStats.pageview', []]],
            };
            digitalData = {
              page: {
                pageInfo: {
                  ibm: {
                    siteId: 'IBM_' + _ibmAnalytics.settings.name,
                  },
                },
                category: {
                  primaryCategory: 'PC100',
                },
              },
            };
          `,
        }),
      ),

      // External script
      JSX.createElement("script", {
        src: "//1.www.s81c.com/common/stats/ibm-common.js",
        type: "text/javascript",
        async: "async",
      }),
    ),
  );
}
