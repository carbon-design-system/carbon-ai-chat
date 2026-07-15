/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect } from "@open-wc/testing";

import { getRawText, textToDoc } from "../json-utils.js";

describe("textToDoc / getRawText round-trip", function () {
  // textToDoc is documented as the inverse of getRawText for plain text:
  // getRawText(textToDoc(s)) === s. Cover empty, single line, blank lines, and
  // leading/trailing newlines so a regression in either direction is caught.
  const cases = [
    "",
    "x",
    "x\ny",
    "x\ny\n",
    "\n",
    "a\n\nb",
    "line1\nline2\nline3",
  ];
  for (const value of cases) {
    it(`preserves ${JSON.stringify(value)}`, () => {
      expect(getRawText(textToDoc(value))).to.equal(value);
    });
  }
});
