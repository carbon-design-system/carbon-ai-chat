/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

const fs = require('fs');
const path = require('path');

// Preserve line positions while removing examples from link and heading checks.
function withoutFencedCode(content) {
  let fence;
  return content
    .split('\n')
    .map((line) => {
      const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
      if (fence) {
        if (
          marker &&
          marker[1][0] === fence[0] &&
          marker[1].length >= fence.length &&
          !marker[2].trim()
        ) {
          fence = undefined;
        }
        return '';
      }
      if (marker) {
        fence = marker[1];
        return '';
      }
      return line;
    })
    .join('\n');
}

// Supports the inline links used by guidance, not the full CommonMark grammar.
function extractLinks(content) {
  const linkRegex =
    /\[([^\]]+)\]\(\s*(<[^>\n]+>|[^\s)]+)(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g;
  return Array.from(
    withoutFencedCode(content).matchAll(linkRegex),
    (match) => ({
      text: match[1],
      url: match[2].replace(/^<|>$/g, ''),
    })
  );
}

function headingSlugs(content) {
  const slugs = new Set();
  for (const line of withoutFencedCode(content).split('\n')) {
    const heading = line.match(/^ {0,3}#{1,6}\s+(.+?)\s*$/);
    if (!heading) {
      continue;
    }
    const base = heading[1]
      .replace(/\s+#+\s*$/, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/<[^>]+>/g, '')
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{M}\p{N}\s_-]/gu, '')
      .replace(/\s/g, '-');
    let slug = base;
    let suffix = 0;
    while (slugs.has(slug)) {
      suffix += 1;
      slug = `${base}-${suffix}`;
    }
    slugs.add(slug);
  }
  return slugs;
}

function isWithinRoot(root, target) {
  const relative = path.relative(root, target);
  return (
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

function resolveLocalTarget(root, file, url) {
  let pathname;
  let anchor;
  try {
    const hash = url.indexOf('#');
    pathname = decodeURIComponent(hash < 0 ? url : url.slice(0, hash));
    anchor = hash < 0 ? '' : decodeURIComponent(url.slice(hash + 1));
  } catch {
    return { problem: 'contains invalid percent encoding.' };
  }

  const source = path.join(root, file);
  const target = pathname
    ? path.resolve(path.dirname(source), pathname.replace(/:\d+$/, ''))
    : source;
  if (!isWithinRoot(root, target)) {
    return { problem: 'resolves outside the repository.' };
  }
  if (!fs.existsSync(target)) {
    return {
      problem: `does not resolve relative to ${path.dirname(file) || '.'}.`,
    };
  }
  if (!isWithinRoot(fs.realpathSync(root), fs.realpathSync(target))) {
    return { problem: 'resolves through a symlink outside the repository.' };
  }
  return { target, anchor };
}

function checkLocalLink(root, file, url) {
  const withoutLineNumber = url.replace(/:\d+(?=#|$)/, '');
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(withoutLineNumber)) {
    return {};
  }
  const resolved = resolveLocalTarget(root, file, url);
  if (resolved.problem) {
    return resolved;
  }
  const { target, anchor } = resolved;
  if (
    anchor &&
    target.endsWith('.md') &&
    fs.statSync(target).isFile() &&
    !headingSlugs(fs.readFileSync(target, 'utf-8')).has(anchor)
  ) {
    return {
      problem: `${path.relative(root, target)} has no heading anchored at #${anchor}.`,
    };
  }
  return { target };
}

module.exports = { checkLocalLink, extractLinks, withoutFencedCode };
