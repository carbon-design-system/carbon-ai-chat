/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  carbonElementTagPlugin,
  internalMembersPlugin,
  readPrefixSetting,
} from '../ai-chat-components/tasks/cem-plugins.js';
import { createFlattenedConfigPlugin } from './tasks/cem-flattened-config.js';

const tablePath = 'src/web-components/shared/flattenedPublicConfig.ts';
const publicConfigPath = 'src/types/config/PublicConfig.ts';
const basePath = 'src/web-components/shared/FlattenedConfigElement.ts';
const hosts = [
  {
    name: 'ChatContainer',
    source: 'src/web-components/cds-aichat-container/cds-aichat-container.ts',
    module:
      'dist/es/web-components/cds-aichat-container/cds-aichat-container.js',
    barrel: {
      source: 'src/web-components/cds-aichat-container/index.ts',
      module: 'dist/es/web-components/cds-aichat-container/index.js',
    },
    registrationSource: 'src/web-components/cds-aichat-container/register.ts',
    attributesInterface: {
      name: 'CdsAiChatContainerAttributes',
      source: 'src/web-components/cds-aichat-container/cds-aichat-container.ts',
    },
  },
  {
    name: 'ChatCustomElement',
    source:
      'src/web-components/cds-aichat-custom-element/cds-aichat-custom-element.ts',
    module:
      'dist/es/web-components/cds-aichat-custom-element/cds-aichat-custom-element.js',
    barrel: {
      source: 'src/web-components/cds-aichat-custom-element/index.ts',
      module: 'dist/es/web-components/cds-aichat-custom-element/index.js',
    },
    attributesInterface: {
      name: 'CdsAiChatCustomElementAttributes',
      source: 'src/web-components/cds-aichat-custom-element/types.ts',
    },
  },
];

export default {
  globs: [
    tablePath,
    publicConfigPath,
    basePath,
    ...hosts.map(({ source }) => source),
    ...hosts.flatMap(({ barrel, registrationSource }) =>
      [barrel?.source, registrationSource].filter(Boolean)
    ),
    ...hosts.map(({ attributesInterface }) => attributesInterface.source),
  ],
  outdir: '.',
  litelement: true,
  packagejson: false,
  plugins: [
    carbonElementTagPlugin({ prefix: readPrefixSetting() }),
    internalMembersPlugin(),
    createFlattenedConfigPlugin({
      tablePath,
      publicConfigPath,
      basePath,
      hosts,
      typeModule: 'dist/types/aiChatEntry.d.ts',
    }),
  ],
};
