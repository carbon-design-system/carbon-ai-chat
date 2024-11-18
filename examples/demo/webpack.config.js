/**
 *
 * IBM Confidential
 *
 * (C) Copyright IBM Corp. 2024
 *
 * The source code for this program is not published or otherwise
 * divested of its trade secrets, irrespective of what has been
 * deposited with the U. S. Copyright Office
 *
 * US Government Users Restricted Rights - Use, duplication or
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 *
 */

import HtmlWebpackPlugin from 'html-webpack-plugin';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default (env, args) => {
  const { mode = 'development' } = args;
  return {
    mode,
    entry: './src/main.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'bundle.js',
      clean: true,
    },
    resolve: {
      alias: {
        lit: path.resolve(__dirname, '../../node_modules/lit'), // Ensure all references point to the same Lit instance
      },
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.css'],
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx|js|jsx)$/, // Combine TypeScript and JavaScript files in one rule
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript'],
              plugins: [
                [
                  '@babel/plugin-proposal-decorators',
                  {
                    decoratorsBeforeExport: true,
                  },
                ],
                '@babel/plugin-transform-private-methods',
              ],
            },
          },
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './index.html',
        inject: 'body',
      }),
    ],
    devtool: 'source-map',
    devServer:
      mode === 'development'
        ? {
            static: path.join(__dirname, 'dist'),
            compress: true,
            port: 3001,
            hot: true,
          }
        : undefined,
  };
};
