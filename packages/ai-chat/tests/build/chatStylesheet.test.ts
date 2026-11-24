/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Guards the prebuilt chat's stylesheet against dead CSS. It compiles
 * `src/chat/AppShell.scss` the way `tasks/rollup.aichat.js` does (legacy Sass
 * with the same include paths, then autoprefixer and comment removal), so the
 * size and the selectors are what ships. `@carbon/ai-chat-components/scss`
 * resolves to that package's built `scss/` folder, so a local run needs a fresh
 * components build. CI builds it first.
 */

import { readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import autoprefixer from 'autoprefixer';
import postcss from 'postcss';
import comments from 'postcss-discard-comments';
import selectorParser from 'postcss-selector-parser';
import * as sass from 'sass';

const PACKAGE_ROOT = resolve(import.meta.dirname, '../..');
const ENTRY = join(PACKAGE_ROOT, 'src/chat/AppShell.scss');

/** The compiled stylesheet may grow to this many bytes. It was 268,427 before the dead CSS went. */
const SIZE_BUDGET = 178_000;

/**
 * Classes the source never spells out whole, each with the line that produces
 * it. A pattern matches the whole class name.
 */
const ALLOWED: { pattern: RegExp; reason: string }[] = [
  {
    pattern: /^cds-aichat--received--width-(reduced|fill|contain)$/,
    reason:
      'MessageComponent.tsx builds `cds-aichat--received--width-${widthCap}`.',
  },
  {
    pattern: /^cds-aichat--button-item--icon-(start|center|end)$/,
    reason:
      'BaseButtonItemComponent.tsx builds `cds-aichat--button-item--icon-${iconAlignment}`.',
  },
  {
    pattern: /^cds-aichat-inline-markdown$/,
    reason:
      "@carbon/ai-chat-components' inline-markdown.ts renders it inside the chat.",
  },
  {
    pattern: /^(cds-aichat-explainability-popover.*|cds--list--ordered|cds--list__item)$/,
    reason:
      'The public src/globals explainability popover styles, which hosts load for their own markup.',
  },
  {
    pattern: /^cds--layout(-constraint)?--/,
    reason:
      "Carbon's layout utilities, emitted by @carbon/ai-chat-components/scss/common. Removing them is a change to that package.",
  },
];

/** Classes inside these pseudo-classes don't decide whether a rule can match. */
const SELECTOR_ARGUMENTS = new Set([':not', ':is', ':where', ':has']);

async function compileChatStylesheet(): Promise<string> {
  const result = sass.renderSync({
    file: ENTRY,
    data: readFileSync(ENTRY, 'utf8'),
    includePaths: [
      PACKAGE_ROOT,
      resolve(PACKAGE_ROOT, 'node_modules'),
      resolve(PACKAGE_ROOT, '../../node_modules'),
    ],
    quietDeps: true,
    silenceDeprecations: ['legacy-js-api'],
  });
  const processed = await postcss([
    autoprefixer(),
    comments({ removeAll: true }),
  ]).process(result.css.toString(), { from: ENTRY });
  return processed.css;
}

/** Every class in a rule's selectors, outside selector arguments. */
function classesOf(css: string): Map<string, string> {
  const classes = new Map<string, string>();
  postcss.parse(css).walkRules((rule) => {
    selectorParser((selectors) => {
      selectors.walkClasses((node) => {
        for (let parent = node.parent; parent; parent = parent.parent) {
          if (
            parent.type === 'pseudo' &&
            SELECTOR_ARGUMENTS.has(parent.value)
          ) {
            return;
          }
        }
        if (!classes.has(node.value)) {
          classes.set(node.value, rule.selector);
        }
      });
    }).processSync(rule.selector);
  });
  return classes;
}

/** The chat's runtime source with comments removed, so a class named only in a comment doesn't count. */
function chatSource(): string {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== '__tests__') {
          walk(path);
        }
      } else if (/\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name)) {
        files.push(path);
      }
    }
  };
  walk(join(PACKAGE_ROOT, 'src'));
  return files
    .map((file) =>
      readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
    )
    .join('\n');
}

describe('the prebuilt chat stylesheet', () => {
  let css: string;
  beforeAll(async () => {
    css = await compileChatStylesheet();
  }, 60_000);

  it('styles only classes the chat renders', () => {
    const source = chatSource();
    const unrendered = [...classesOf(css)]
      .filter(([name]) => !ALLOWED.some(({ pattern }) => pattern.test(name)))
      .filter(([name]) => {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return !new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`).test(source);
      })
      .map(([name, selector]) => `${name} (in ${selector})`);
    expect(unrendered).toEqual([]);
  });

  it('has no selector that can never match', () => {
    const impossible: string[] = [];
    postcss.parse(css).walkRules((rule) => {
      if (/:host\s+:host\(|:host\s+:root/.test(rule.selector)) {
        impossible.push(rule.selector);
      }
    });
    expect(impossible).toEqual([]);
  });

  it("carries none of Carbon's button component styles", () => {
    expect(css).not.toMatch(/\.cds--btn\b/);
  });

  it('keeps the Carbon theme classes', () => {
    for (const theme of ['white', 'g10', 'g90', 'g100']) {
      expect(css).toMatch(new RegExp(`\\.cds--${theme}\\s*\\{`));
    }
  });

  it(`stays within ${SIZE_BUDGET} bytes`, () => {
    expect(Buffer.byteLength(css)).toBeLessThanOrEqual(SIZE_BUDGET);
  });
});
