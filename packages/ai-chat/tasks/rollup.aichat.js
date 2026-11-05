/*
 *  Copyright IBM Corp. 2025, 2026
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
import TypeScript, { parseJsonConfigFileContent, sys } from 'typescript';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';

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

// TypeScript can schedule one final watch update after a watch program closes,
// which recreates file watchers and prevents one-shot Rollup builds from exiting.
// Track the host timers so closing the program also cancels those pending updates.
const typescriptWithSafeWatchClose = {
  ...TypeScript,
  createWatchProgram(host) {
    const timers = new Set();
    const { setTimeout: schedule, clearTimeout: cancel } = host;

    if (schedule && cancel) {
      host.setTimeout = (callback, milliseconds, ...args) => {
        const timer = schedule(
          () => {
            timers.delete(timer);
            callback(...args);
          },
          milliseconds,
          ...args,
        );
        timers.add(timer);
        return timer;
      };
      host.clearTimeout = (timer) => {
        timers.delete(timer);
        cancel(timer);
      };
    }

    const program = TypeScript.createWatchProgram(host);
    const { close } = program;
    program.close = () => {
      close.call(program);
      if (cancel) {
        timers.forEach((timer) => cancel(timer));
      }
      timers.clear();
    };
    return program;
  },
};

/**
 * Simplified tsconfig for dts plugin.
 */
const dtsTsConfig = {
  compilerOptions: {
    jsx: 'react-jsx', // Enables the new JSX runtime
    allowSyntheticDefaultImports: true, // Allows default imports for React
    esModuleInterop: true, // Ensures compatibility with ES modules
    stripInternal: true, // Strip @internal types from generated .d.ts files
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
  await fs.remove(path.join(paths.dist, 'es-custom'));
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
        'web-components/cds-aichat-container/cds-aichat-container': path.join(paths.src, '/web-components/cds-aichat-container/cds-aichat-container.ts'),

        // Web components - becomes es/web-components/cds-aichat-custom-element/index.js
        'web-components/cds-aichat-custom-element/index': path.join(paths.src, '/web-components/cds-aichat-custom-element/index.ts'),
        'web-components/cds-aichat-custom-element/cds-aichat-custom-element': path.join(paths.src, '/web-components/cds-aichat-custom-element/cds-aichat-custom-element.ts'),
      },
      output: {
        dir: path.join(paths.dist, '/es'),
        format: 'es',
        // Preserve source paths so package sideEffects rules follow setup code.
        preserveModules: true,
        preserveModulesRoot: paths.src,
        entryFileNames: '[name].js',
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
          typescript: typescriptWithSafeWatchClose,
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
          ecma: 2020,
          module: true,
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
        'web-components/cds-aichat-container/index': path.join(paths.src, '/web-components/cds-aichat-container/index.ts'),
        'web-components/cds-aichat-container/cds-aichat-container': path.join(paths.src, '/web-components/cds-aichat-container/cds-aichat-container.ts'),
        'web-components/cds-aichat-custom-element/index': path.join(paths.src, '/web-components/cds-aichat-custom-element/index.ts'),
        'web-components/cds-aichat-custom-element/cds-aichat-custom-element': path.join(paths.src, '/web-components/cds-aichat-custom-element/cds-aichat-custom-element.ts'),
      },
      output: {
        dir: path.join(paths.dist, '/types'),
        format: 'es',
        entryFileNames: '[name].d.ts',
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
  // Copy SCSS files from src/globals/scss to dist/scss (public exports)
  const scssSourceDir = path.resolve(__dirname, "../src/globals/scss");
  const scssTargetDir = path.resolve(__dirname, "../dist/scss");
  await fs.copy(scssSourceDir, scssTargetDir);
  console.log("Copied public SCSS files to dist/scss");

  // Compile public SCSS to CSS
  const sass = await import('sass');
  const cssTargetDir = path.resolve(__dirname, "../dist/css");
  await fs.ensureDir(cssTargetDir);
  const scssEntries = [
    { input: path.resolve(__dirname, "../src/globals/scss/_chat-float-layout.scss"), output: "chat-float-layout.css" },
    { input: path.resolve(__dirname, "../src/globals/scss/_chat-launcher-layout.scss"), output: "chat-launcher-layout.css" },
    { input: path.resolve(__dirname, "../src/globals/scss/_chat-explainability-popover.scss"), output: "chat-explainability-popover.css" },
    { input: path.resolve(__dirname, "../src/globals/scss/_chat-sidebar-layout.scss"), output: "chat-sidebar-layout.css" },
  ];
  for (const entry of scssEntries) {
    const result = sass.compile(entry.input, {
      loadPaths: [
        path.resolve(__dirname, "../node_modules"),
        path.resolve(__dirname, "../../../node_modules"),
      ],
      style: "expanded",
      quietDeps: true,
      silenceDeprecations: ["legacy-js-api"],
    });
    await fs.writeFile(path.resolve(cssTargetDir, entry.output), result.css);
    console.log(`Compiled ${entry.output}`);
  }
}


function postBuildPlugin() {
  return {
    name: "postbuild-plugin",
    async writeBundle() {
      await postBuild();
    },
  };
}

export default () => runRollup();
