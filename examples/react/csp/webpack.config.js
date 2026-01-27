/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import HtmlWebpackPlugin from "html-webpack-plugin";
import CspHtmlWebpackPlugin from "csp-html-webpack-plugin";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const environment = process.env.ENVIRONMENT
  ? process.env.ENVIRONMENT
  : "production";

// Generate a random nonce for this build
const nonce = crypto.randomBytes(16).toString("base64");

export default () => {
  const port = process.env.PORT || 3022;

  return {
    mode: environment,
    entry: "./src/App.tsx",
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "bundle.js",
      clean: true,
    },
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".jsx"],
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
            },
          },
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: "./index.html",
        inject: "body",
        scriptLoading: "defer",
      }),
      new CspHtmlWebpackPlugin(
        {
          "default-src": "'self'",
          "script-src": ["'self'", `'nonce-${nonce}'`],
          "style-src": "'self'",
          "connect-src": "'self'",
          "img-src": ["'self'", "data:", "blob:"],
          "font-src": "'self'",
          "object-src": "'none'",
          "base-uri": "'self'",
          "form-action": "'self'",
          "frame-ancestors": "'none'",
          "upgrade-insecure-requests": [],
        },
        {
          enabled: true,
          hashingMethod: "sha256",
          hashEnabled: {
            "script-src": false,
            "style-src": false,
          },
          nonceEnabled: {
            "script-src": true,
            "style-src": false,
          },
        },
      ),
    ],
    devtool: "source-map",
    devServer: {
      static: path.join(__dirname, "dist"),
      compress: true,
      port,
      open: true,
      hot: true,
      headers: {
        "Content-Security-Policy": [
          "default-src 'self'",
          `script-src 'self' 'nonce-${nonce}'`,
          "style-src 'self'",
          "connect-src 'self' ws: wss:",
          "img-src 'self' data: blob:",
          "font-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'none'",
        ].join("; "),
      },
    },
  };
};

// Made with Bob
