/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { expect } from "@open-wc/testing";

import { parseUnknownDataToMarkdown } from "../src/parse-unknown-data-to-markdown.js";

describe("parseUnknownDataToMarkdown", () => {
  it("formats object data as a markdown code block", () => {
    const data = { key: "value", number: 42 };
    const result = parseUnknownDataToMarkdown(data);
    expect(result).to.equal(
      '```\n{\n  "key": "value",\n  "number": 42\n}\n```\n',
    );
  });

  it("formats JSON strings as a markdown code block", () => {
    const data = '{"key": "value"}';
    const result = parseUnknownDataToMarkdown(data);
    expect(result).to.equal('```\n{\n  "key": "value"\n}\n```\n');
  });

  it("returns non-JSON strings as-is", () => {
    const data = "hello world";
    const result = parseUnknownDataToMarkdown(data);
    expect(result).to.equal("hello world");
  });

  it("converts other primitives to strings", () => {
    const result = parseUnknownDataToMarkdown(42);
    expect(result).to.equal("42");
  });

  it("returns undefined for null or undefined values", () => {
    expect(parseUnknownDataToMarkdown(null)).to.be.undefined;
    expect(parseUnknownDataToMarkdown(undefined)).to.be.undefined;
  });

  it("returns undefined for other falsy values", () => {
    expect(parseUnknownDataToMarkdown(false)).to.be.undefined;
    expect(parseUnknownDataToMarkdown(0)).to.be.undefined;
    expect(parseUnknownDataToMarkdown("")).to.be.undefined;
  });
});
