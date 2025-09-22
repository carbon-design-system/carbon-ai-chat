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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async (_env, args) => {
  const port = await portfinder.getPortPromise({
    port: process.env.PORT || 3001,
  });
  const { mode = "development" } = args;
  return {
    mode,
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
          test: /\.(ts|tsx|js|jsx)$/, // Combine TypeScript and JavaScript files in one rule
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
    ],
    devtool: "source-map",
    devServer:
      mode === "development"
        ? {
            static: path.join(__dirname, "dist"),
            compress: true,
            port,
            hot: true,
            open: true,
          }
        : undefined,
  };
};
