/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  carbonElementTagPlugin,
  componentModulePathsPlugin,
  internalMembersPlugin,
  readPrefixSetting,
} from './tasks/cem-plugins.js';

export default {
  globs: ['src/**/*.ts'],
  exclude: [
    '**/__stories__/**',
    '**/__tests__/**',
    '**/*.test.ts',
    '**/*.stories.ts',
    '**/*.d.ts',
    'src/globals/internal/storybook-cdn.ts',
  ],
  outdir: '.',
  litelement: true,
  packagejson: false,
  plugins: [
    carbonElementTagPlugin({ prefix: readPrefixSetting() }),
    internalMembersPlugin(),
    componentModulePathsPlugin(),
  ],
};
