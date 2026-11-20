/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

interface RunBreaks {
  /** Newlines to restore before the body. */
  leading: string;
  /** The run without the newlines at its edges. */
  body: string;
  /** Newlines to restore after the body. */
  trailing: string;
}

/**
 * Splits a text run into the newlines at its edges and the body between them.
 * The inline markdown renderer drops newlines at the edge of a run, so a break
 * beside a chip is restored by the caller. A break at the start or end of the
 * paragraph is dropped, and a run of only newlines counts each break once.
 *
 * @param run The text of the run, with hard breaks as `\n`.
 * @param isFirst Whether the run starts the paragraph.
 * @param isLast Whether the run ends the paragraph.
 */
function splitRunBreaks(
  run: string,
  isFirst: boolean,
  isLast: boolean
): RunBreaks {
  const onlyBreaks = /^\n+$/.test(run);
  const leading =
    isFirst || (isLast && onlyBreaks) ? '' : (run.match(/^\n+/)?.[0] ?? '');
  const rest = run.slice(leading.length);
  const trailing = isLast ? '' : (rest.match(/\n+$/)?.[0] ?? '');
  const body = rest.slice(0, rest.length - trailing.length);
  return { leading, body, trailing };
}

export { splitRunBreaks };
export type { RunBreaks };
