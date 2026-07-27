/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { stringifyCSV } from "../csv";

describe("stringifyCSV", () => {
  it("terminates every record with a newline", () => {
    expect(
      stringifyCSV([
        ["a", "b"],
        ["c", "d"],
      ]),
    ).toBe("a,b\nc,d\n");
  });

  it("returns an empty string for no rows", () => {
    expect(stringifyCSV([])).toBe("");
  });

  it("quotes fields containing the delimiter", () => {
    expect(stringifyCSV([["with,comma", "plain"]])).toBe(
      '"with,comma",plain\n',
    );
  });

  it("escapes quotes by doubling them", () => {
    expect(stringifyCSV([['with"quote', "x"]])).toBe('"with""quote",x\n');
  });

  it("quotes fields containing a line break", () => {
    expect(stringifyCSV([["with\nnewline", "x"]])).toBe('"with\nnewline",x\n');
    expect(stringifyCSV([["with\rcarriage", "x"]])).toBe(
      '"with\rcarriage",x\n',
    );
  });

  it("renders empty and nullish fields as empty, preserving zero", () => {
    expect(stringifyCSV([["", null, undefined, 0, 42]])).toBe(",,,0,42\n");
  });

  it("preserves surrounding whitespace without quoting", () => {
    expect(stringifyCSV([[" leading space", "trailing "]])).toBe(
      " leading space,trailing \n",
    );
  });
});
