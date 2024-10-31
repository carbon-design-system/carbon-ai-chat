// webpack.config.js

import path from "path";
import HtmlWebpackPlugin from "html-webpack-plugin";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: "development",
  entry: "./src/main.ts",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
    clean: true,
  },
  resolve: {
    alias: {
      lit: path.resolve(__dirname, "../../node_modules/lit"), // Ensure all references point to the same Lit instance
    },
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
              [
                "@babel/plugin-proposal-decorators",
                {
                  decoratorsBeforeExport: true,
                },
              ],
              "@babel/plugin-proposal-class-properties",
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
    port: 3000,
    hot: true,
  },
};
