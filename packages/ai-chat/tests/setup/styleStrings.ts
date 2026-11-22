/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import postcss from 'postcss';
import { compileString } from 'sass';
import type { Plugin } from 'vite';

const prefix = '\0caic-style-string:';

/**
 * Imports the chat's own `.css` and `.scss` files as compiled CSS strings, the
 * way the Rollup build inlines them. It runs before Vite's CSS handling, which
 * would otherwise turn `AppShell.scss` into an empty module.
 */
export function chatStyleStrings(packageRoot: string): Plugin {
  const chatRoot = packageRoot + path.sep;
  const workspaceModules = path.resolve(packageRoot, '../../node_modules');
  return {
    name: 'caic-style-strings',
    enforce: 'pre',
    async resolveId(source, importer) {
      if (!importer || !/\.s?css$/.test(source)) {
        return null;
      }
      const resolved = await this.resolve(source, importer, {
        skipSelf: true,
      });
      if (!resolved || !resolved.id.startsWith(chatRoot)) {
        return null;
      }
      return `${prefix}${Buffer.from(resolved.id).toString('base64url')}.mjs`;
    },
    load(id) {
      if (!id.startsWith(prefix)) {
        return null;
      }
      const file = Buffer.from(
        id.slice(prefix.length, -'.mjs'.length),
        'base64url'
      ).toString();
      this.addWatchFile(file);
      const source = readFileSync(file, 'utf8');
      const css = file.endsWith('.scss')
        ? compileString(source, {
            url: pathToFileURL(file),
            style: 'expanded',
            quietDeps: true,
            loadPaths: [
              path.dirname(file),
              path.join(packageRoot, 'node_modules'),
              workspaceModules,
            ],
          }).css
        : source;
      const compiled = postcss().process(css, { from: file }).css;
      return { code: `export default ${JSON.stringify(compiled)};`, map: null };
    },
  };
}
