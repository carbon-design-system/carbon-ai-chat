/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

beforeEach(() => {
  // Mock DOMParser for icon transformation tests
  if (typeof DOMParser === "undefined") {
    (global as any).DOMParser = class DOMParser {
      parseFromString(str: string, _type: string) {
        // Simple mock for testing - in real browser this would parse the string
        const doc = {
          querySelector: (selector: string) => {
            if (selector === "svg" && str.includes("<svg")) {
              // Extract attributes from SVG string
              const viewBoxMatch = str.match(/viewBox="([^"]*)"/);
              const fillMatch = str.match(/fill="([^"]*)"/);
              const xmlnsMatch = str.match(/xmlns="([^"]*)"/);

              // Extract path data
              const pathMatch = str.match(/<path[^>]*d="([^"]*)"[^>]*>/);

              const mockSVG = {
                tagName: "svg",
                getAttribute: (attr: string) => {
                  if (attr === "viewBox") {
                    return viewBoxMatch ? viewBoxMatch[1] : "0 0 32 32";
                  }
                  if (attr === "fill") {
                    return fillMatch ? fillMatch[1] : "currentColor";
                  }
                  if (attr === "xmlns") {
                    return xmlnsMatch
                      ? xmlnsMatch[1]
                      : "http://www.w3.org/2000/svg";
                  }
                  return null;
                },
                childNodes: pathMatch
                  ? [
                      {
                        nodeType: 1, // ELEMENT_NODE
                        tagName: "path",
                        attributes: [
                          {
                            name: "d",
                            value: pathMatch[1],
                          },
                        ],
                      },
                    ]
                  : [],
                cloneNode: function (_deep: boolean) {
                  return this;
                },
              };

              return mockSVG;
            }
            return null;
          },
        };
        return doc;
      }
    };
  }

  // Mock Node constants if not available
  if (typeof Node === "undefined") {
    (global as any).Node = {
      ELEMENT_NODE: 1,
      TEXT_NODE: 3,
    };
  }
});

// Made with Bob
