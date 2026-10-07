/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/** A substring of an answer associated with a citation. */
export interface CitationRange {
  /** Inclusive start offset in JavaScript string code units. */
  start: number;
  /** Exclusive end offset in JavaScript string code units. */
  end: number;
}

/** The answer ranges associated with a citation. */
export interface CitationWithRanges {
  /** Ranges to highlight; citations without ranges sort last. */
  ranges?: readonly CitationRange[];
}

/** Wraps nonblank citation ranges in Markdown highlight delimiters. */
export function insertHighlightMarkdown(
  text: string,
  highlightCitation?: CitationWithRanges | null
): string {
  const ranges = highlightCitation?.ranges;
  if (!ranges?.length) {
    return text;
  }
  const sortedRanges = [...ranges].sort((a, b) => b.start - a.start);
  let processedText = text;
  for (const range of sortedRanges) {
    const beforeHighlight = processedText.substring(0, range.start);
    const highlight = processedText.substring(range.start, range.end);
    const afterHighlight = processedText.substring(range.end);
    if (highlight.trim()) {
      processedText =
        beforeHighlight + '==' + highlight + '==' + afterHighlight;
    }
  }
  return processedText;
}

/** Moves citations without ranges to the end, preserving each group's order. */
export function sortCitations<T extends CitationWithRanges>(
  citations?: readonly T[] | null
): T[] | null {
  if (!citations) {
    return null;
  }
  const withRanges = citations.filter((citation) => citation.ranges?.length);
  const withoutRanges = citations.filter(
    (citation) => !citation.ranges?.length
  );
  return withRanges.concat(withoutRanges);
}
