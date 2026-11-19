/**
 * @license
 * Copyright IBM Corp. 2026
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */
const path = require('node:path');
const base = require('./jest.config.cjs');

const versions = [
  [17, '../../examples/react/frameworks-react-17/node_modules'],
  [18, '../../examples/react/frameworks-react-18/node_modules'],
  [19, '../../node_modules'],
];
module.exports = {
  projects: versions.flatMap(([major, modules]) =>
    ['happy-dom', 'jsdom'].map((dom) => {
      const root = path.resolve(__dirname, modules);
      return {
        ...base,
        rootDir: __dirname,
        displayName: `react-${major}-${dom}`,
        roots: ['<rootDir>/src/react/__tests__'],
        testRegex: undefined,
        testMatch: ['**/web-component-interop.test.tsx'],
        testEnvironment:
          dom === 'happy-dom'
            ? '@happy-dom/jest-environment'
            : 'jest-environment-jsdom',
        testEnvironmentOptions: { customExportConditions: ['browser'] },
        globals: { CAIC_INTEROP_REACT_MAJOR: major },
        setupFilesAfterEnv: [
          ...base.setupFilesAfterEnv,
          '<rootDir>/src/react/__tests__/interop.setup.ts',
        ],
        transform: {
          '^.+\\.(ts|tsx|js|jsx|mjs)$': [
            'babel-jest',
            { configFile: path.join(__dirname, 'babel.config.jest.cjs') },
          ],
        },
        moduleNameMapper: {
          '^react$': path.join(root, 'react/index.js'),
          '^react/(.*)$': path.join(root, 'react/$1'),
          '^react-dom$': path.join(root, 'react-dom/index.js'),
          '^react-dom/(.*)$': path.join(root, 'react-dom/$1'),
          ...base.moduleNameMapper,
        },
      };
    })
  ),
};
