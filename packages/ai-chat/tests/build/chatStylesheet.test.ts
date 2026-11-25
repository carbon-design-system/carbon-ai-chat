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
 * `src/chat/AppShell.scss` the way `tasks/rollup.aichat.js` does, so the size
 * and the selectors are what ships. That build runs rollup-plugin-postcss,
 * which calls Sass's legacy `render` API, so this calls the legacy API too,
 * with the same include paths, then autoprefixer and comment removal.
 * `@carbon/ai-chat-components/scss` resolves to that package's built `scss/`
 * folder, so a local run needs a fresh components build. CI builds it first.
 */

import { readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import autoprefixer from 'autoprefixer';
import postcss from 'postcss';
import comments from 'postcss-discard-comments';
import * as sass from 'sass';
import ts from 'typescript';

const PACKAGE_ROOT = resolve(import.meta.dirname, '../..');
const ENTRY = join(PACKAGE_ROOT, 'src/chat/AppShell.scss');

/** The most bytes the compiled stylesheet may take. Raise it only for styles the chat renders. */
const SIZE_BUDGET = 185_000;

/**
 * Classes the source never spells out whole, each with the reason it stays.
 * A pattern matches the whole class name.
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
    pattern: /^carousel__/,
    reason:
      "@carbon/utilities' initCarousel adds these to the carousel's slides, which render inside the chat.",
  },
  {
    pattern: /^cds--(assistive-text|visually-hidden)$/,
    reason:
      "Carbon's utilities emit this rule, and the carousel module loads them, so it can't go without the carousel styles.",
  },
  {
    pattern: /^cds--layout(-constraint)?--/,
    reason:
      "@carbon/web-components' overflow menu adds `cds--layout--size-${size}` to its host, which renders inside the chat. These rules come from @carbon/ai-chat-components/scss/common.",
  },
  {
    pattern:
      /^(cds-aichat-explainability-popover.*|cds--list--ordered|cds--list__item)$/,
    reason:
      "src/globals' explainability popover styles. The chat renders none of them, but they come from the public globals, which this check leaves alone.",
  },
];

/**
 * Carbon's carousel module pairs each `.carousel__…` selector with a
 * `:host(.carousel__…)` one. Under the chat's `:host`, the second can't match,
 * but it shares a rule with the live first one.
 */
const ALLOWED_IMPOSSIBLE = /^:host\s+:host\(\.carousel__/;

/** A selector the chat's `:host` wrapper makes impossible to match. */
const IMPOSSIBLE = /:host\s+(:host\b|:root\b|html\b|body\b)/;

/** Classes inside these pseudo-classes don't decide whether a rule can match. */
const SELECTOR_ARGUMENTS = /:(not|is|where|has)\(/g;

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

/** A selector with the arguments of `:not()`, `:is()`, `:where()`, and `:has()` cut out. */
function withoutSelectorArguments(selector: string): string {
  let result = '';
  let index = 0;
  for (const match of selector.matchAll(SELECTOR_ARGUMENTS)) {
    if (match.index < index) {
      continue;
    }
    result += selector.slice(index, match.index);
    let depth = 1;
    let end = match.index + match[0].length;
    for (; end < selector.length && depth > 0; end++) {
      if (selector[end] === '(') {
        depth++;
      } else if (selector[end] === ')') {
        depth--;
      }
    }
    index = end;
  }
  return result + selector.slice(index);
}

/** Every class in a rule's selectors, outside selector arguments, with a selector that uses it. */
function classesOf(css: string): Map<string, string> {
  const classes = new Map<string, string>();
  postcss.parse(css).walkRules((rule) => {
    if (rule.parent?.type === 'atrule' && /keyframes$/.test(rule.parent.name)) {
      return;
    }
    for (const selector of rule.selectors) {
      // Attribute values, such as `[href$=".pdf"]`, hold no classes.
      const bare = withoutSelectorArguments(selector).replace(/\[[^\]]*\]/g, '');
      for (const [, name] of bare.matchAll(
        /\.(-?[_a-zA-Z][\w-]*)/g
      )) {
        if (!classes.has(name)) {
          classes.set(name, selector);
        }
      }
    }
  });
  return classes;
}

/**
 * The text of every string literal and template in the chat's runtime source.
 * A class named only in a comment, a type, or an identifier doesn't count.
 */
function chatStrings(): string {
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
  const strings: string[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      strings.push(node.text);
    }
    ts.forEachChild(node, visit);
  };
  for (const file of files) {
    visit(
      ts.createSourceFile(
        file,
        readFileSync(file, 'utf8'),
        ts.ScriptTarget.Latest,
        false,
        file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
      )
    );
  }
  return strings.join('\n');
}

describe('the prebuilt chat stylesheet', () => {
  let css: string;
  beforeAll(async () => {
    css = await compileChatStylesheet();
  }, 60_000);

  it('styles only classes the chat renders', () => {
    const strings = chatStrings();
    const unrendered = [...classesOf(css)]
      .filter(([name]) => !ALLOWED.some(({ pattern }) => pattern.test(name)))
      .filter(([name]) => {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return !new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`).test(strings);
      })
      .map(([name, selector]) => `${name} (in ${selector})`);
    expect(unrendered).toEqual([]);
  });

  it('has no selector that can never match', () => {
    const impossible: string[] = [];
    postcss.parse(css).walkRules((rule) => {
      for (const selector of rule.selectors) {
        if (IMPOSSIBLE.test(selector) && !ALLOWED_IMPOSSIBLE.test(selector)) {
          impossible.push(selector);
        }
      }
    });
    expect(impossible).toEqual([]);
  });

  it("carries none of Carbon's button component styles", () => {
    expect(css).not.toMatch(/\.cds--btn\b/);
  });

  it('keeps the Carbon theme classes, with the button tokens', () => {
    const themes = new Map<string, string>();
    postcss.parse(css).walkRules((rule) => {
      const match = /^:host \.cds--(white|g10|g90|g100)$/.exec(rule.selector);
      if (match) {
        themes.set(match[1], (themes.get(match[1]) ?? '') + rule.toString());
      }
    });
    for (const theme of ['white', 'g10', 'g90', 'g100']) {
      expect(themes.get(theme)).toContain('--cds-button-primary:');
    }
  });

  it(`stays within ${SIZE_BUDGET} bytes`, () => {
    expect(Buffer.byteLength(css)).toBeLessThanOrEqual(SIZE_BUDGET);
  });
});
