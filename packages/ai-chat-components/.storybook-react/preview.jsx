import React from "react";
import containerStyles from "../.storybook/_container.scss?inline";
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
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: { expanded: true },
  docs: {
    inlineStories: true,
    codePanel: true,
    source: {
      excludeDecorators: false,
    },
  },
};

export const decorators = [
  (Story, context) => {
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
        <Story />
      </div>
    );
  },
];
