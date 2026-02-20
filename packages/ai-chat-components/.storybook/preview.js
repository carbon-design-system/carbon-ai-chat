/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/** @type { import('@storybook/web-components-vite').Preview } */

import { html } from "lit";
import containerStyles from "./_container.scss?inline";
import { white, g10, g90, g100 } from "@carbon/themes";
import { breakpoints } from "@carbon/layout";
import { setCustomElementsManifest } from "@storybook/web-components-vite";
import customElements from "../custom-elements.json";
import prettier from "prettier/standalone";

if (typeof document !== "undefined") {
  const existing = document.head.querySelector(
    'style[data-storybook-container="true"]',
  );
  if (!existing) {
    const style = document.createElement("style");
    style.setAttribute("data-storybook-container", "true");
    style.textContent = containerStyles;
    document.head.appendChild(style);
  }
}

setCustomElementsManifest(customElements);

export const globalTypes = {
  theme: {
    name: "Theme",
    description: "Set the global theme for displaying components",
    defaultValue: "white",
    toolbar: {
      icon: "paintbrush",
      items: ["white", "g10", "g90", "g100"],
    },
  },
  dir: {
    name: "Text direction",
    description: "Set the text direction for the story",
    defaultValue: "ltr",
    toolbar: {
      icon: "transfer",
      title: "Text direction",
      items: [
        {
          right: "🔄",
          title: "auto",
          value: "auto",
        },
        {
          right: "➡️",
          title: "left-to-right (ltr)",
          value: "ltr",
        },
        {
          right: "⬅️",
          title: "right-to-left (rtl)",
          value: "rtl",
        },
      ],
    },
  },
};

export const parameters = {
  backgrounds: {
    // https://storybook.js.org/docs/react/essentials/backgrounds#grid
    grid: {
      cellSize: 8,
      opacity: 0.5,
    },
    options: {
      white: {
        name: "white",
        value: white.background,
      },

      g10: {
        name: "g10",
        value: g10.background,
      },

      g90: {
        name: "g90",
        value: g90.background,
      },

      g100: {
        name: "g100",
        value: g100.background,
      },
    },
  },
  controls: {
    // https://storybook.js.org/docs/react/essentials/controls#show-full-documentation-for-each-property
    expanded: true,

    // https://storybook.js.org/docs/react/essentials/controls#specify-initial-preset-color-swatches
    // presetColors: [],

    // https://storybook.js.org/docs/react/essentials/controls#sorting-controls
    sort: "alpha",

    hideNoControlsWarning: true,
  },
  darkMode: {
    current: "light",
  },
  docs: {
    codePanel: true,
    defaultName: "Overview",
    source: {
      excludeDecorators: true,
      transform: async (source) => {
        return prettier.format(source, {
          parser: "html",
          plugins: [await import("prettier/parser-html")],
          printWidth: 80,
        });
      },
    },
  },
  previewTabs: {
    "storybook/docs/panel": {
      title: "Overview",
      index: 0,
    },
  },
  // Small (<672)
  // Medium (672 - 1056px)
  // Large (1056 - 1312px)
  // X-Large (1312 - 1584px)
  // Max (>1584)
  viewport: {
    options: {
      sm: {
        name: "Small",
        styles: {
          width: breakpoints.sm.width,
          height: "100%",
        },
      },
      md: {
        name: "Medium",
        styles: {
          width: breakpoints.md.width,
          height: "100%",
        },
      },
      lg: {
        name: "Large",
        styles: {
          width: breakpoints.lg.width,
          height: "100%",
        },
      },
      xlg: {
        name: "X-Large",
        styles: {
          width: breakpoints.xlg.width,
          height: "100%",
        },
      },
      Max: {
        name: "Max",
        styles: {
          width: breakpoints.max.width,
          height: "100%",
        },
      },
    },
  },
  options: {
    storySort: {
      method: "alphabetical",
      order: [
        "Introduction",
        [
          "Welcome",
          "Custom styles",
          "Carbon CDN style helpers",
          "Form Participation",
        ],
        "Components",
        [
          "Card",
          "Chat shell",
          "Chain of thought",
          "Chat button",
          "Code snippet",
          [
            "Default",
            "Highlight",
            "Streaming With Language Set",
            "Streaming With Language Detection",
            "With No Tile Container",
            "Editable",
            "Editable Empty",
          ],
        ],
        "Layout",
      ],
    },
  },
};

export const decorators = [
  function decoratorContainer(story, context) {
    const { theme, dir } = context.globals;

    document.documentElement.setAttribute("storybook-carbon-theme", theme);
    document.documentElement.dir = dir;
    return html` <div
      id="main-content"
      name="main-content"
      data-floating-menu-container
      data-modal-container
      role="main"
    >
      ${story()}
    </div>`;
  },
];
