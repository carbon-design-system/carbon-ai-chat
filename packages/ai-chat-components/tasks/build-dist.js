/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

'use strict';

import path from 'path';
import { fileURLToPath } from 'url';
import { rollup } from 'rollup';
import autoprefixer from 'autoprefixer';
import alias from '@rollup/plugin-alias';
import commonjs from '@rollup/plugin-commonjs';
import cssnano from 'cssnano';
import fs from 'fs';
import postcss from 'postcss';
import replace from '@rollup/plugin-replace';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import fixHostPseudo from '../tools/postcss-fix-host-pseudo.js';
import license from '../tools/rollup-plugin-license.js';
import litSCSS from '../tools/rollup-plugin-lit-scss.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const componentEntries = {
  'audio-player.min': 'src/components/aichat-audio-player/index.ts',
  'card.min': 'src/components/aichat-card/index.ts',
  'carousel.min': 'src/components/aichat-carousel/index.ts',
  'chain-of-thought.min': 'src/components/aichat-chain-of-thought/index.ts',
  'chat-button.min': 'src/components/aichat-button/index.ts',
  'chat-history.min': 'src/components/aichat-history/index.ts',
  'chat-shell.min': 'src/components/aichat-shell/index.ts',
  'code-snippet.min': 'src/components/aichat-code-snippet/index.ts',
  'conversational-search.min':
    'src/components/aichat-conversational-search/index.ts',
  'feedback.min': 'src/components/aichat-feedback/index.ts',
  'file-uploads.min': 'src/components/aichat-file-uploads/index.ts',
  'launcher.min': 'src/components/aichat-launcher/index.ts',
  'markdown.min': 'src/components/aichat-markdown/index.ts',
  'processing.min': 'src/components/aichat-processing/index.ts',
  'prompt-line.min': 'src/components/aichat-prompt-line/index.ts',
  'reasoning-steps.min': 'src/components/aichat-reasoning-steps/index.ts',
  'table.min': 'src/components/aichat-table/index.ts',
  'toolbar.min': 'src/components/aichat-toolbar/index.ts',
  'truncated-text.min': 'src/components/aichat-truncated-text/index.ts',
  'video-player.min': 'src/components/aichat-video-player/index.ts',
  'workspace-shell.min': 'src/components/aichat-workspace-shell/index.ts',
};

/**
 * Builds all of the rollup bundles for all components
 */
async function buildDist() {
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
  }

  return rollup(getRollupConfig())
    .then((bundle) => {
      bundle.write({
        format: 'es',
        dir: 'dist',
        banner: 'let process = { env: {} };',
      });
    })
    .catch((err) => {
      console.error(err);
    });
}

/**
 * Sets the rollup configuration based on various settings
 *
 * @returns {object} The Rollup config.
 */
function getRollupConfig() {
  const postCSSPlugins = [fixHostPseudo(), autoprefixer(), cssnano()];

  const licenseOptions = {
    whitelist: /^(carbon-components|@carbon*)$/i,
    async licenseSelf() {
      return `/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */
`;
    },
  };

  return {
    input: componentEntries,
    plugins: [
      alias({
        entries: [{ find: /^(.*)\.scss\?lit$/, replacement: '$1.scss' }],
      }),
      nodeResolve({
        browser: true,
        mainFields: ['jsnext', 'module', 'main'],
        extensions: ['.js', '.ts', '.tsx'],
      }),
      commonjs({
        include: [/node_modules/],
        sourceMap: true,
      }),
      typescript({
        noEmitOnError: true,
        declaration: false,
        compilerOptions: {
          rootDir: 'src',
          outDir: 'dist',
        },
      }),
      litSCSS({
        includePaths: [
          path.resolve(__dirname, '../node_modules'),
          path.resolve(__dirname, '../../../node_modules'),
        ],
        async preprocessor(contents, id) {
          return (await postcss(postCSSPlugins).process(contents, { from: id }))
            .css;
        },
      }),
      replace({
        'process.env.NODE_ENV': 'production',
        preventAssignment: true,
      }),
      terser(),
      license(licenseOptions),
    ],
  };
}

buildDist().catch((error) => {
  console.log(error);
  process.exit(1);
});
