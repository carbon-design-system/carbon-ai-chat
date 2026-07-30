/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * reading-level.mjs — score the reading level of Markdown docs.
 *
 * Gives one number everyone can reproduce, so "simpler" is measured, not
 * argued. Uses the `text-readability` package (a port of the widely used
 * Python `textstat`) to compute the Flesch-Kincaid grade level — the U.S.
 * school grade needed to read the text on a first pass.
 *
 * It scores the prose a reader actually sees. Before scoring, it strips
 * what a reader does not read as sentences: YAML frontmatter, fenced code
 * blocks, GFM tables, TypeDoc `{@link}` references, and Markdown syntax.
 *
 * Usage:
 *   node scripts/reading-level.mjs <file.md> [more.md ...]
 *   node scripts/reading-level.mjs <file.md> --max 9   # exit 1 if any file is above grade 9
 *
 * Run over the docs:
 *   node scripts/reading-level.mjs packages/ai-chat/docs/*.md
 */

import { readFileSync } from "node:fs";
import rs from "text-readability";

/**
 * Turn Markdown into the plain prose a reader sees, so the score reflects
 * reading, not syntax.
 */
function markdownToProse(markdown) {
  let text = markdown;

  // Drop YAML frontmatter.
  text = text.replace(/^---\n[\s\S]*?\n---\n/, "");

  // Drop fenced code blocks — code has no reading level.
  text = text.replace(/```[\s\S]*?```/g, "");

  // Drop GFM table blocks — a header row, a `|---|` delimiter row, and body
  // rows. Removing the whole block (as with code fences) avoids merging cells
  // into a false run-on sentence. Detection anchors on the delimiter row, so
  // prose with a stray `|` is left alone.
  const isTableDelimiter = (line) => {
    if (!line.includes("|")) return false;
    const cells = line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|");
    return cells.length > 0 && cells.every((c) => /^\s*:?-+:?\s*$/.test(c));
  };
  const srcLines = text.split("\n");
  const withoutTables = [];
  for (let i = 0; i < srcLines.length; i++) {
    if (
      srcLines[i].includes("|") &&
      i + 1 < srcLines.length &&
      isTableDelimiter(srcLines[i + 1])
    ) {
      let j = i + 2; // skip header + delimiter, then contiguous body rows
      while (j < srcLines.length && srcLines[j].includes("|")) j++;
      i = j - 1; // for-loop `++` advances past the block
      continue;
    }
    withoutTables.push(srcLines[i]);
  }
  text = withoutTables.join("\n");

  // Drop TypeDoc `{@link ...}` references entirely — both `{@link Target}` and
  // `{@link Target | display}`. They render as code-styled cross-reference
  // links, and scoring their dotted targets as one long word distorts the
  // grade. See references/tone.md.
  text = text.replace(/\{@link\s+[^}]*\}/g, "");

  // `[text](url)` -> text.
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");

  // Inline code, bold, italic — keep the words, drop the marks.
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/(^|[^*])\*([^*]+)\*/g, "$1$2");

  // Line-level markers: headings, list bullets, blockquotes.
  const lines = text.split("\n").map((line) => {
    let l = line.replace(/^\s{0,3}#{1,6}\s+/, ""); // headings
    l = l.replace(/^\s*[-*+]\s+/, ""); // bullets
    l = l.replace(/^\s*\d+\.\s+/, ""); // numbered list
    l = l.replace(/^\s*>\s?/, ""); // blockquote
    l = l.trim();
    // A heading or bullet is a unit of reading; give it a period so the
    // readability tokenizer counts it as one sentence, not a run-on.
    if (l && !/[.!?:]$/.test(l)) {
      l += ".";
    }
    return l;
  });

  return lines.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function score(file) {
  const prose = markdownToProse(readFileSync(file, "utf8"));
  return {
    file,
    grade: rs.fleschKincaidGrade(prose),
    ease: rs.fleschReadingEase(prose),
    standard: rs.textStandard(prose, true),
    words: rs.lexiconCount(prose),
    sentences: rs.sentenceCount(prose),
    perSentence: rs.lexiconCount(prose) / Math.max(rs.sentenceCount(prose), 1),
  };
}

const args = process.argv.slice(2);
const maxIdx = args.indexOf("--max");
const max = maxIdx === -1 ? null : Number(args[maxIdx + 1]);
const files = args.filter(
  (a, i) => a !== "--max" && !(maxIdx !== -1 && i === maxIdx + 1),
);

if (files.length === 0) {
  console.error("usage: node scripts/reading-level.mjs <file.md> [...] [--max <grade>]");
  process.exit(2);
}

const rows = files.map(score);
const pad = (s, n) => String(s).padEnd(n);
console.log(
  pad("grade", 7) + pad("ease", 7) + pad("w/sent", 8) + pad("words", 7) + "file",
);
for (const r of rows) {
  console.log(
    pad(r.grade.toFixed(1), 7) +
      pad(r.ease.toFixed(0), 7) +
      pad(r.perSentence.toFixed(1), 8) +
      pad(r.words, 7) +
      r.file,
  );
}

if (max !== null) {
  const over = rows.filter((r) => r.grade > max);
  if (over.length) {
    console.error(
      `\n${over.length} file(s) above grade ${max}: ` +
        over.map((r) => `${r.file} (${r.grade.toFixed(1)})`).join(", "),
    );
    process.exit(1);
  }
  console.log(`\nAll ${rows.length} file(s) at or below grade ${max}.`);
}
