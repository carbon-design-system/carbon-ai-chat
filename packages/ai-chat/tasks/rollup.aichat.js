/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import terser from '@rollup/plugin-terser';
import { babel } from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import autoprefixer from 'autoprefixer';
import path from 'path';
import comments from 'postcss-discard-comments';
import { dts } from 'rollup-plugin-dts';
import postcss from 'rollup-plugin-postcss';
import { visualizer } from 'rollup-plugin-visualizer';
import { parseJsonConfigFileContent, sys } from 'typescript';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import { globby } from 'globby';

import pkg from '../package.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const paths = {
  root: path.resolve(__dirname, '../'),
  src: path.resolve(__dirname, '../src'),
  dist: path.resolve(__dirname, '../dist'),
};

const workspaceDir = path.resolve(__dirname, '../');

process.chdir(workspaceDir);


const external = [
  ...Object.keys(pkg.peerDependencies || []),
  ...Object.keys(pkg.dependencies || [])
].map(name => new RegExp(`^${name}(/.*)?`));

const treeshake = true;

/**
 * Simplified tsconfig for dts plugin.
 */
const dtsTsConfig = {
  compilerOptions: {
    baseUrl: './',
    jsx: 'react-jsx', // Enables the new JSX runtime
    allowSyntheticDefaultImports: true, // Allows default imports for React
    esModuleInterop: true, // Ensures compatibility with ES modules
  },
  include: [path.join(paths.src, '/**/*')],
};

/**
 * Some of the config options, like "jsx", need to actually be parsed through typescript before they go to dts plugin.
 */
const parsedDtsTsConfig = parseJsonConfigFileContent(
  dtsTsConfig, // Pass the config object directly
  sys, // File system utilities
  './', // Base directory for resolving paths
);

async function runRollup() {
  const extraWatch = path.resolve(__dirname, '../../ai-chat-components/es/**/*');

  const config = [
    // Main build
    {
      watch: {
        include: [path.join(paths.src, '/**/*'), extraWatch],
        exclude: [],
        chokidar: {
          // Delay rebuilds until files settle so the watcher doesn't try to compile half-written artifacts
          awaitWriteFinish: {
            stabilityThreshold: 750,
            pollInterval: 100,
          },
        },
        clearScreen: false,
      },
      // Allow entry chunks to depend on side-effect imports from
      // other entry chunks (e.g., custom-element importing container)
      preserveEntrySignatures: 'exports-only',
      onwarn(warning, warn) {
        // Treat circular dependencies as errors
        if (warning.code === "CIRCULAR_DEPENDENCY") {
          // Some Rollup versions provide `ids`, fall back to message string
          const ids = warning.ids || [];
          const inNodeModules = ids.some(id => id.includes("node_modules"));

          if (!inNodeModules) {
            // Circular dep in your own source -> error
            throw new Error(`Circular dependency detected in app code: ${warning.message}`);
          }
        }
        // For other warnings, use default behavior
        warn(warning);
      },
      input: {
        // Main entry - becomes es/aiChatEntry.js
        'aiChatEntry': path.join(paths.src, '/aiChatEntry.tsx'),

        // Server entry without web component side effects - becomes es/serverEntry.js
        'serverEntry': path.join(paths.src, '/serverEntry.ts'),

        // Web components - becomes es/web-components/cds-aichat-container/index.js
        'web-components/cds-aichat-container/index': path.join(paths.src, '/web-components/cds-aichat-container/index.ts'),

        // Web components - becomes es/web-components/cds-aichat-custom-element/index.js
        'web-components/cds-aichat-custom-element/index': path.join(paths.src, '/web-components/cds-aichat-custom-element/index.ts'),
      },
      output: {
        dir: path.join(paths.dist, '/es'),
        format: 'es',
        preserveModules: false,
        entryFileNames: '[name].js',
        chunkFileNames: 'chat.[name].js',
        sourcemap: process.env.NODE_ENV !== 'production',
        banner: `/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */`,
      },
      external,
      treeshake,
      plugins: [
        postcss({
          extensions: ['.css', '.scss'],
          inject: false,
          modules: false,
          extract: false,
          sourceMap: false,
          plugins: [autoprefixer(), comments({ removeAll: true })],
          use: [
            [
              'sass',
              {
                // You can add includePaths here, but often the Sass importer works well without extensive paths.
                includePaths: [process.cwd(), path.resolve(paths.root, 'node_modules'), path.resolve(paths.root, '../../', 'node_modules')],
                quietDeps: true,
                silenceDeprecations: ['legacy-js-api'],
              },
            ],
          ],
          verbose: true,
          failOnError: true,
        }),
        json(),
        nodeResolve({
          browser: true,
          extensions: ['.js'],
        }),
        commonjs({
          include: /node_modules/,
          transformMixedEsModules: true,
          requireReturnsDefault: 'auto',
          esmExternals: true,
        }),
        replace({
          preventAssignment: true,
          'process.env.VERSION': JSON.stringify(pkg.version.split('-')[0]),
          'process.env.NODE_ENV': JSON.stringify('production'),
        }),
        typescript({
          tsconfig: path.join(paths.root, '/tsconfig.json'),
          allowSyntheticDefaultImports: true,
          compilerOptions: {
            outDir: path.join(paths.dist, '/es'),
          },
        }),
        babel({
          babelHelpers: 'runtime',
          configFile: path.join(paths.root, '/.babelrc'),
          cwd: paths.root,
          exclude: /^(.+\/)?node_modules\/.+$/,
        }),
        terser({
          compress: false,
          mangle: false,
          format: {
            beautify: true,
            indent_level: 2,
            // Remove all comments - the copyright header is added via banner
            comments: false
          }
        }),
        process.env.profile === 'true' && visualizer({ gzipSize: true, open: true }),
      ],
    },
    // Type generation for exports.
    {
      input: {
        aiChatEntry: path.join(paths.src, '/aiChatEntry.tsx'),
        serverEntry: path.join(paths.src, '/serverEntry.ts'),
      },
      output: {
        dir: path.join(paths.dist, '/types'),
        format: 'es',
        entryFileNames: chunkInfo => {
          const inputFile = chunkInfo.facadeModuleId || chunkInfo.moduleIds[0];
          const baseName = path.basename(inputFile, path.extname(inputFile)); // Get the base name of the file
          return `${baseName}.d.ts`;
        },
      },
      external,
      plugins: [
        json(),
        dts({
          compilerOptions: parsedDtsTsConfig.compilerOptions,
        }),
        postBuildPlugin(),
      ],
    },
  ];
  return config;
}

async function postBuild() {
  const sourceDir = path.resolve(__dirname, "../dist/es");
  const targetDir = path.resolve(__dirname, "../dist/es-custom");

  // Copy `es` directory to `es-custom`
  await fs.copy(sourceDir, targetDir);

  // Find all files in the `es-custom` directory
  const files = await globby([`${targetDir}/**/*`], { onlyFiles: true });

  await Promise.all(
    files.map(async (file) => {
      let content = await fs.promises.readFile(file, "utf8");

      // Find import/export lines and transform only the small, allowed parts in them.
      // Then replace those lines with placeholders so global replacements don't touch them.
      const importExportRegex = /^[ \t]*(?:import|export)[^\r\n]*(?:\r?\n|$)/gm;
      const placeholders = [];

      const masked = content.replace(importExportRegex, (match) => {
        /**
         *  In import/export lines we allow:
         *  1. __cds_aichat -> __cds_custom_aichat
         *     This is in particular for the
         *     "export { default as __cds_custom_aichat_container_register } from "../cds-aichat-container/index.js";
         *     line in the `dist/es/web-components/cds-aichat-custom-element/index.js` file
         *.  2. rewrite carbon import paths to es-custom
         *
         *  but we DO NOT do the generic 'cds' -> 'cds-custom' replacement here.
         **/
        let mod = match
          .replace(/__cds_aichat/g, "__cds_custom_aichat")
          .replace(
            /@carbon\/web-components\/es\/components\/(.*?)(?=['"\s;])/g,
            "@carbon/web-components/es-custom/components/$1"
          );

        const token = `__IE_PLACEHOLDER_${placeholders.length}__`;
        placeholders.push(mod);
        return token;
      });

      /**
       * On the rest of the file (masked), perform the global replacements:
       *  1. cds-aichat -> cds-custom-aichat (class names, etc.)
       *  2. generic cds -> cds-custom (but skip:
       *     - occurrences preceded by '-' (so --cds is preserved)
       *     - occurrences already followed by -custom/_custom to prevent double replace)
       *  3. rewrite any remaining @carbon import paths that weren't in import/export lines
       **/
      let transformed = masked;

      // convert cds-aichat (CSS class prefixes and similar)
      transformed = transformed.replace(/cds-aichat/g, "cds-custom-aichat");

      // generic cds -> cds-custom with guards:
      //  (?<!-)  : not immediately preceded by '-'  (so `--cds` or `-cds` won't match)
      //  (?!-custom|_custom) : not already followed by -custom or _custom (prevent double replace)
      transformed = transformed.replace(
        /(?<!-)cds(?!-custom|_custom)([A-Za-z0-9_-]*)/g,
        (_m, suffix) => `cds-custom${suffix}`
      );

      // rewrite @carbon paths anywhere else (catch any non-import appearances too)
      transformed = transformed.replace(
        /@carbon\/web-components\/es\/components\/(.*?)(?=['"\s;])/g,
        "@carbon/web-components/es-custom/components/$1"
      );

      // restore the import/export placeholders back into the content
      const restored = transformed.replace(/__IE_PLACEHOLDER_(\d+)__/g, (_m, idx) => {
        return placeholders[Number(idx)];
      });

      // write file back
      await fs.promises.writeFile(file, restored);
    })
  );
}


function postBuildPlugin() {
  return {
    name: "postbuild-plugin",
    async writeBundle() {
      console.log("outputting es-custom folder...");
      await postBuild();
    },
  };
}

export default () => runRollup();
