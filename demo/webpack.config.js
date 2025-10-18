/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import HtmlWebpackPlugin from "html-webpack-plugin";
import path from "path";
import { fileURLToPath } from "url";
import portfinder from "portfinder";
import { promises as fs } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple plugin to copy versions.js from root to dist
class CopyVersionsPlugin {
  apply(compiler) {
    compiler.hooks.afterEmit.tapPromise("CopyVersionsPlugin", async () => {
      const source = path.resolve(__dirname, "..", "versions.js");
      const dest = path.resolve(__dirname, "dist", "versions.js");

      try {
        await fs.copyFile(source, dest);
        console.log("Copied versions.js to dist/");
      } catch (error) {
        console.warn("Failed to copy versions.js:", error.message);
      }
    });
  }
}

export default async (_env, args) => {
  const port = await portfinder.getPortPromise({
    port: process.env.PORT || 3001,
  });

  const { mode = "development" } = args;

  return {
    mode,
    // Speed up incremental builds
    cache: { type: "filesystem" },

    entry: "./src/main.ts",

    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "bundle.js",
      clean: true,
    },

    resolve: {
      extensions: [".ts", ".tsx", ".js", ".jsx", ".css"],
    },

    module: {
      rules: [
        {
          test: /\.(ts|tsx|js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
            options: {
              presets: [
                "@babel/preset-env",
                "@babel/preset-react",
                "@babel/preset-typescript",
              ],
              plugins: [
                ["@babel/plugin-proposal-decorators", { version: "2023-05" }],
                "@babel/plugin-proposal-class-properties",
                "@babel/plugin-transform-private-methods",
              ],
            },
          },
        },
        {
          test: /\.css$/,
          use: ["style-loader", "css-loader"],
        },
      ],
    },

    plugins: [
      new HtmlWebpackPlugin({
        template: "./index.html",
        inject: "body",
      }),
      new CopyVersionsPlugin(),
    ],

    devtool: "source-map",

    // Debounce rebuilds after the first detected change
    watchOptions: {
      aggregateTimeout: 800, // ms
      ignored: /node_modules/,
    },

    devServer:
      mode === "development"
        ? {
            static: path.join(__dirname, "dist"),
            compress: true,
            port,
            host: "0.0.0.0",
            allowedHosts: "all",
            hot: true,
            open: true,

            // Watch external build output and wait until writes settle
            watchFiles: {
              paths: [
                path.resolve(
                  __dirname,
                  "..",
                  "packages",
                  "ai-chat",
                  "dist",
                  "**/*",
                ),
              ],
              options: {
                // chokidar options
                awaitWriteFinish: {
                  stabilityThreshold: 600, // ms of quiet before triggering
                  pollInterval: 100,
                },
              },
            },
          }
        : undefined,
  };
};
