/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from "react";
import containerStyles from "../.storybook/_container.scss?inline";
import prettier from "prettier/standalone";
import prettierPluginBabel from "prettier/plugins/babel";
import prettierPluginEstree from "prettier/plugins/estree";

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
  controls: {
    // https://storybook.js.org/docs/react/essentials/controls#show-full-documentation-for-each-property
    expanded: true,

    // https://storybook.js.org/docs/react/essentials/controls#specify-initial-preset-color-swatches
    // presetColors: [],

    // https://storybook.js.org/docs/react/essentials/controls#sorting-controls
    sort: "alpha",

    hideNoControlsWarning: true,
  },
  docs: {
    codePanel: true,
    source: {
      transform: async (source) => {
        return prettier.format(source, {
          parser: "babel",
          plugins: [prettierPluginBabel, prettierPluginEstree],
        });
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

    return (
      <div
        id="main-content"
        name="main-content"
        data-floating-menu-container
        data-modal-container
        role="main"
      >
        {story()}
      </div>
    );
  },
];
