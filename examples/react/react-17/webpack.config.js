/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import HtmlWebpackPlugin from "html-webpack-plugin";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const environment = process.env.ENVIRONMENT
  ? process.env.ENVIRONMENT
  : "production";

export default () => {
  const port = process.env.PORT || 3002;

  return {
    mode: environment,
    entry: "./src/App.tsx",
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "bundle.js",
      clean: true,
    },
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".jsx", ".css"],
      alias: {
        // Force React 17 to be resolved from this example's node_modules
        react: path.resolve(__dirname, "node_modules/react"),
        "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
      },
      fullySpecified: false,
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
    devServer: {
      static: path.join(__dirname, "dist"),
      compress: true,
      port,
      open: true,
      hot: true,
    },
  };
};

// Made with Bob
