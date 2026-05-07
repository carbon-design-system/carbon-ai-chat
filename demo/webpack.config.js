/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import path from "path";
import { fileURLToPath } from "url";
import portfinder from "portfinder";
import { promises as fs } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Strict CSP applied to both the meta tag in index.html and the dev-server header.
// Dev needs ws:/wss: in connect-src for HMR; the meta tag (production) does not.
const CSP_BASE =
  "default-src 'self'; " +
  "script-src 'self' https://1.www.s81c.com https://www.youtube.com https://player.vimeo.com https://cdn.embed.ly https://w.soundcloud.com; " +
  "style-src 'self' https://1.www.s81c.com; " +
  "img-src 'self' data: blob: https://1.www.s81c.com https://live.staticflickr.com; " +
  "font-src 'self' https://1.www.s81c.com; " +
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://w.soundcloud.com https://cdnapisec.kaltura.com https://web-chat.assistant.test.watson.cloud.ibm.com; " +
  "media-src https://web-chat.assistant.test.watson.cloud.ibm.com; " +
  "object-src 'none'; " +
  "base-uri 'self'; " +
  "form-action 'self'; " +
  "frame-ancestors 'none';";
const CSP_DEV = `${CSP_BASE} connect-src 'self' https://1.www.s81c.com ws: wss:;`;

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

// Copy demo/public/* into dist/ so files like analytics-init.js are reachable
// from same-origin (required by strict CSP — no 'unsafe-inline' for scripts).
class CopyPublicPlugin {
  apply(compiler) {
    compiler.hooks.afterEmit.tapPromise("CopyPublicPlugin", async () => {
      const sourceDir = path.resolve(__dirname, "public");
      const destDir = path.resolve(__dirname, "dist");

      try {
        const entries = await fs.readdir(sourceDir);
        await Promise.all(
          entries.map((entry) =>
            fs.copyFile(path.join(sourceDir, entry), path.join(destDir, entry)),
          ),
        );
      } catch (error) {
        if (error.code !== "ENOENT") {
          console.warn("Failed to copy public/:", error.message);
        }
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
          use: [MiniCssExtractPlugin.loader, "css-loader"],
        },
      ],
    },

    plugins: [
      new HtmlWebpackPlugin({
        template: "./index.html",
        inject: "body",
      }),
      new MiniCssExtractPlugin({ filename: "[name].css" }),
      new CopyVersionsPlugin(),
      new CopyPublicPlugin(),
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
            headers: {
              "Content-Security-Policy": CSP_DEV,
            },

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
