import path from "path";
import { mergeConfig } from "vite";

export default {
  stories: ["../src/react/**/*.stories.@(js|jsx|ts|tsx)"],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  async viteFinal(config) {
    return mergeConfig(config, {
      resolve: {
        alias: {
          "@components": path.resolve(__dirname, "../src/components"),
        },
      },
    });
  },
};
