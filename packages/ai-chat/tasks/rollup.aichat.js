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

const workerSrc = path.join(paths.src,
  'chat/web-components/components/markdownText/markdown/workers/markdownWorker.ts');
const workerOut = path.join(paths.dist, 'es',
  'chat/web-components/components/markdownText/markdown/workers/markdownWorker.js');


const external = [
  ...Object.keys(pkg.peerDependencies || []),
  ...Object.keys(pkg.dependencies || [])
].map(name => new RegExp(`^${name}(/.*)?`));

const treeshake = true;

/*{
  // Treat modules as side-effect-free unless otherwise specified
  moduleSideEffects: id => {
    // Treat your own code as having side effects if necessary to prevent it from being removed.
    if (id.includes('src/') || id.includes('@carbon/web-components')) {
      return true;
    }
    // For external dependencies, be more specific or allow them all.
    return /node_modules/.test(id);
  }
  // pureExternalModules: true, // Treat all external modules as pure
};*/

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

/**
 * This is a built step for building the markdown webworker as a different file. Not yet in use.
 */
const workerBuild = {
      input: workerSrc,
      output: {
        file: workerOut,
        format: 'es',
        sourcemap: false,
        inlineDynamicImports: true,
        banner: `/* 
 *  Copyright IBM Corp. 2025
 *  
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */`,
      },
      external: [],                  
      plugins: [
        nodeResolve({
          browser: true,
          extensions: ['.js', '.ts'],
        }),
        commonjs({
          include: /node_modules/,
        }),
        typescript({
          tsconfig: path.join(paths.root,'tsconfig.json'),
          compilerOptions: {
            outDir: path.join(paths.dist, 'es'),
            declaration: false,
            module: 'ESNext',
            target: 'ES2021',
          }
        }),
        terser({
          format: {
            comments: /Copyright IBM Corp\./,
            ascii_only: true
          },
          mangle: true,
          compress: {
            passes: 2
          }
        })
      ],
    };

async function runRollup() {
  const config = [
    // Main build with preserveModules for tree-shaking
    {
      input: [
        path.join(paths.src, '/aiChatEntry.tsx'),
        path.join(paths.src, '/web-components/cds-aichat-container/index.ts'),
        path.join(paths.src, '/web-components/cds-aichat-custom-element/index.ts'),
      ],
      output: {
        dir: path.join(paths.dist, '/es'),
        format: 'es',
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
      },
      external,
      treeshake,
      plugins: [
        postcss({
          extensions: ['.css', '.scss'],
          inject: false, // Do not inject into <head>
          modules: false, // No CSS modules
          extract: false, // or true, if you want a separate CSS file
          sourceMap: false,
          plugins: [autoprefixer(), comments({ removeAll: true })],
          // Pass options directly to the Sass processor:
          use: [
            [
              'sass',
              {
                // You can add includePaths here, but often the Sass importer works well without extensive paths.
                includePaths: [process.cwd(), path.resolve(paths.root, 'node_modules'), path.resolve(paths.root, '../../', 'node_modules')],
                // If needed, you can also add a custom importer here.
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
            // keep only comments that contain @license
            comments: (_astNode, comment) => {
              const text = comment.value;
              // comment.type === "comment2" for /* … */
              if (comment.type === 'comment2') {
                return /@license/i.test(text);
              }
              return false;
            }
          }
        }),
        process.env.profile === 'true' && visualizer({ gzipSize: true, open: true }),
      ],
    },
    // Type generation for exports.
    {
      input: {
        aiChatEntry: path.join(paths.src, '/aiChatEntry.tsx'),
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
      ],
    },
  ];
  return config;
}

export default () => runRollup();
