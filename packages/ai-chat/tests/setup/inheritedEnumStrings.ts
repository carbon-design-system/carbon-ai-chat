/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import path from 'node:path';
import type { Plugin } from 'vite';

/**
 * `PageObjectId` copies some members from the components package's
 * `PageObjectId` (`CHAT_HEADER = BasePageObjectId.CHAT_HEADER`). TypeScript's
 * build sees that the source is a string enum and emits plain string members.
 * Vitest compiles one file at a time with Oxc, which cannot see that, so it
 * also adds reverse mappings (`PageObjectId['chat-header'] = 'CHAT_HEADER'`),
 * and `Object.values(PageObjectId)` gains member names. Under Vitest only,
 * spell those initializers as template strings, which Oxc knows are strings.
 * The published source and build output stay as they are.
 */
export function inheritedEnumStrings(packageRoot: string): Plugin {
  const file = path.join(packageRoot, 'src/testing/PageObjectId.ts');
  const member = /=\s*BasePageObjectId\.([A-Z0-9_]+)\s*,/g;
  return {
    name: 'caic-inherited-enum-strings',
    enforce: 'pre',
    transform(code, id) {
      if (id.split('?')[0] !== file) {
        return null;
      }
      const rewritten = code.replace(
        member,
        (_, name) => `= \`\${BasePageObjectId.${name}}\`,`
      );
      if (rewritten === code) {
        throw new Error(
          `${file} no longer copies BasePageObjectId members; remove this plugin.`
        );
      }
      return { code: rewritten, map: null };
    },
  };
}
