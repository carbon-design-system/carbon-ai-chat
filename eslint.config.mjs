/**
 * @license
 *
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

/** @type {import('eslint').Linter.Config[]} */
const config = [
  // Patterns carried over from .eslintignore
  {
    ignores: [
      // package-level generated output directories (match at any workspace depth)
      'packages/*/es/**',
      'packages/*/es-custom/**',
      'packages/*/lib/**',
      'packages/*/dist/**',
      'packages/*/umd/**',
      'packages/*/storybook-static/**',
      'packages/*/storybook-react-static/**',
      // also covers demo/ and examples/* which may emit to dist/
      'demo/*/dist/**',
      'examples/*/dist/**',
      '**/node_modules/**',
      '**/*.snap.js',
      'packages/ai-chat/tasks/**',
      // generated output — must not be linted
      '**/custom-elements.json',
    ],
  },

  // Base config from eslint-config-carbon (legacy compat) — JS/JSX only
  // TS overrides are handled separately below using @typescript-eslint v8
  ...compat.extends('eslint-config-carbon'),

  {
    languageOptions: {
      parserOptions: {
        // Linting needs JSX syntax, not Carbon's Babel 7 development transforms.
        babelOptions: {
          babelrc: false,
          configFile: false,
          presets: ['@babel/preset-react'],
        },
      },
    },
  },

  // TypeScript files: use @typescript-eslint v8 (ESLint 9 compatible)
  // This replaces the legacy TS override that eslint-config-carbon carries.
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    languageOptions: {
      parser: tsParser,
    },
    rules: {
      ...tsPlugin.configs['recommended'].rules,
      // Replicate the overrides from the legacy eslint-config-carbon react.js
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'after-used',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      // These patterns are intentional in this codebase:
      // - interface merging is used for the Lit mixin / web-component pattern
      // - `string & {}` and empty extends are used deliberately for type-level docs
      '@typescript-eslint/no-unsafe-declaration-merging': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },

  // JS files: extend no-unused-vars to also ignore _-prefixed caught errors
  {
    files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
    rules: {
      'no-unused-vars': [
        'error',
        {
          args: 'after-used',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },

  // Repo-wide rule overrides
  {
    settings: {
      jsdoc: {
        // Prevent the jsdoc plugin from recommending replacement of @typeParam
        // with @template. @typeParam is the TypeDoc standard used throughout
        // the codebase; it is registered as a valid tag via definedTags below.
        tagNamePreference: {
          typeParam: 'typeParam',
        },
      },
    },
    rules: {
      'no-warning-comments': [
        'error',
        {
          terms: ['Made with Bob'],
          location: 'anywhere',
        },
      ],
      'jsdoc/check-tag-names': [
        'error',
        {
          definedTags: [
            'category',
            'element',
            'experimental',
            'typeParam',
            'template',
            'inheritDoc',
            'hidden',
            'ignore',
            'internal',
            'override',
            'packageDocumentation',
            'public',
            'protected',
            'private',
            'readonly',
            'sealed',
            'showCategories',
            'slot',
            'virtual',
          ],
        },
      ],
    },
  },

  // Test-file overrides
  {
    files: [
      '**/__tests__/**/*.ts',
      '**/__tests__/**/*.tsx',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
    ],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      // Web-component tests use expect(...) as a statement; @typescript-eslint
      // v8 recommended enables no-unused-expressions which rejects this pattern.
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
];

export default config;
