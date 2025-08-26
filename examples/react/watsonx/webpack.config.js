/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import HtmlWebpackPlugin from "html-webpack-plugin";
import Statoscope from "@statoscope/webpack-plugin";
import path from "path";
import { fileURLToPath } from "url";
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";
import Dotenv from "dotenv-webpack";
import portfinder from "portfinder";
import open from "open";

const { default: StatoscopeWebpackPlugin } = Statoscope;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const shouldAnalyze = process.env.ANALYZE === "true";

const environment = process.env.ENVIRONMENT
  ? process.env.ENVIRONMENT
  : "production";

const createPlugins = (includeAnalysis) => {
  const plugins = [
    new HtmlWebpackPlugin({
      template: "./index.html",
      inject: "body",
    }),
    new Dotenv({
      systemvars: true,
    }),
  ];

  if (includeAnalysis) {
    plugins.push(
      new StatoscopeWebpackPlugin({
        statsOptions: { modules: true, reasons: true },
        open: "file",
      }),
    );

    plugins.push(new BundleAnalyzerPlugin());

    console.log(
      "Statoscope analysis enabled - report will be generated after build",
    );
  }

  return plugins;
};

export default async (env, args) => {
  const port = await portfinder.getPortPromise({
    port: process.env.PORT || 3003,
  });

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
    },
    stats: {
      modules: true, // list modules
      reasons: true, // include why they were included
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
    plugins: createPlugins(shouldAnalyze),
    devtool: "source-map",
    devServer: {
      static: path.join(__dirname, "dist"),
      compress: true,
      port,
      onListening(server) {
        console.log("✅ onListening fired!");
        const port = server.server.address().port;
        open(`http://localhost:${port}`);
      },
      hot: true,
    },
  };
};
