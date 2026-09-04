/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

type CSVValue = string | number | null | undefined;

// A field needs quoting when it contains the delimiter, a quote, or a line break.
const NEEDS_QUOTING = /[",\r\n]/;

function formatField(value: CSVValue): string {
  if (value === null || value === undefined) {
    return '';
  }

  const field = String(value);

  if (!NEEDS_QUOTING.test(field)) {
    return field;
  }

  return `"${field.replace(/"/g, '""')}"`;
}

/**
 * Serializes rows into an RFC 4180 CSV string. Every record, including the last, is terminated by a
 * newline; an empty input produces an empty string.
 */
function stringifyCSV(rows: CSVValue[][]): string {
  return rows.map((row) => `${row.map(formatField).join(',')}\n`).join('');
}

export { stringifyCSV };
