/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/** @type { import('@storybook/web-components-vite').Preview } */
/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html } from "lit";
import containerStyles from "./_container.scss?inline";
import { white, g10, g90, g100 } from "@carbon/themes";
import { breakpoints } from "@carbon/layout";
import theme from "./theme";
import { setCustomElementsManifest } from "@storybook/web-components-vite";
import customElements from "../custom-elements.json";
import prettier from "prettier/standalone";

setCustomElementsManifest(customElements);

export const globalTypes = {
  locale: {
    name: "Locale",
    description: "Set the localization for the storybook",
    defaultValue: "en",
    toolbar: {
      icon: "globe",
      items: [
        {
          right: "🇺🇸",
          title: "English",
          value: "en",
        },
        {
          right: "🇵🇸",
          title: "Arabic",
          value: "ar",
        },
      ],
    },
  },
  theme: {
    name: "Theme",
    description: "Set the global theme for displaying components",
    defaultValue: "white",
    toolbar: {
      icon: "paintbrush",
      items: ["white", "g10", "g90", "g100"],
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
    values: [
      {
        name: "white",
        value: white.background,
      },
      {
        name: "g10",
        value: g10.background,
      },
      {
        name: "g90",
        value: g90.background,
      },
      {
        name: "g100",
        value: g100.background,
      },
    ],
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
    source: {
      excludeDecorators: false, // prevents decorators and story styles from being included in the source code
      transform: async (source) => {
        const cleaned = source.replace(/<style[\s\S]*?<\/style>/gi, "");

        return prettier.format(cleaned, {
          parser: "html",
          plugins: [await import("prettier/parser-html")],
          printWidth: 80,
        });
      },
    },
    theme,
  },
  // Small (<672)
  // Medium (672 - 1056px)
  // Large (1056 - 1312px)
  // X-Large (1312 - 1584px)
  // Max (>1584)
  viewport: {
    viewports: {
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
      order: [
        "Introduction",
        [
          "Welcome",
          "Custom styles",
          "Carbon CDN style helpers",
          "Form Participation",
        ],
        "Components",
        "Layout",
      ],
    },
  },
};

export const decorators = [
  function decoratorContainer(story, context) {
    const { theme } = context.globals;

    document.documentElement.setAttribute("storybook-carbon-theme", theme);

    return html` <style>
        ${containerStyles}
      </style>
      <div
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
