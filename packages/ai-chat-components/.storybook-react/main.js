import path from "path";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { mergeConfig } from "vite";
import remarkGfm from "remark-gfm";

const require = createRequire(import.meta.url);

export default {
  stories: [
    "./welcome/welcome.mdx",
    "../src/**/__stories__/*-react.mdx",
    "../src/**/__stories__/*.stories.@(jsx|tsx)",
  ],
  addons: [
    {
      name: getAbsolutePath("@storybook/addon-docs"),
      options: {
        mdxPluginOptions: {
          mdxCompileOptions: {
            remarkPlugins: [remarkGfm],
          },
        },
      },
    },
    getAbsolutePath("@storybook/addon-links"),
    getAbsolutePath("@storybook/addon-a11y"),
  ],
  framework: {
    name: getAbsolutePath("@storybook/react-vite"),
    options: {},
  },
  features: {
    storyStoreV7: true,
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

function getAbsolutePath(value) {
  return dirname(require.resolve(join(value, "package.json")));
}
