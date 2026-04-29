/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect } from "@open-wc/testing";
import { inputSchema } from "../schema.js";
import { parseRawValue, serializeDoc } from "../serializer.js";

function makeToken(value: string, label = value) {
  return inputSchema.nodes.token.create({
    id: "id",
    label,
    type: "mention",
    value,
    data: null,
  });
}

describe("prosemirror/serializer", function () {
  describe("serializeDoc", function () {
    it("serializes an empty doc to an empty string", () => {
      const doc = inputSchema.nodes.doc.create(null, [
        inputSchema.nodes.paragraph.create(),
      ]);
      expect(serializeDoc(doc)).to.equal("");
    });

    it("serializes a single paragraph of text", () => {
      const doc = inputSchema.nodes.doc.create(null, [
        inputSchema.nodes.paragraph.create(null, inputSchema.text("hello")),
      ]);
      expect(serializeDoc(doc)).to.equal("hello");
    });

    it("joins multiple paragraphs with newlines", () => {
      const doc = inputSchema.nodes.doc.create(null, [
        inputSchema.nodes.paragraph.create(null, inputSchema.text("a")),
        inputSchema.nodes.paragraph.create(null, inputSchema.text("b")),
        inputSchema.nodes.paragraph.create(),
        inputSchema.nodes.paragraph.create(null, inputSchema.text("c")),
      ]);
      expect(serializeDoc(doc)).to.equal("a\nb\n\nc");
    });

    it("serializes token nodes via their value attribute", () => {
      const doc = inputSchema.nodes.doc.create(null, [
        inputSchema.nodes.paragraph.create(null, [
          inputSchema.text("hi "),
          makeToken("@Jane"),
          inputSchema.text(" there"),
        ]),
      ]);
      expect(serializeDoc(doc)).to.equal("hi @Jane there");
    });
  });

  describe("parseRawValue", function () {
    it("produces a doc with one empty paragraph for an empty string", () => {
      const doc = parseRawValue(inputSchema, "");
      expect(doc.childCount).to.equal(1);
      expect(doc.firstChild?.type.name).to.equal("paragraph");
      expect(doc.firstChild?.childCount).to.equal(0);
    });

    it("splits on newlines into separate paragraphs", () => {
      const doc = parseRawValue(inputSchema, "a\nb\n\nc");
      expect(doc.childCount).to.equal(4);
      expect(doc.child(0).textContent).to.equal("a");
      expect(doc.child(1).textContent).to.equal("b");
      expect(doc.child(2).textContent).to.equal("");
      expect(doc.child(3).textContent).to.equal("c");
    });

    it("round-trips with serializeDoc for plain text", () => {
      const input = "line one\nline two\n\nline four";
      expect(serializeDoc(parseRawValue(inputSchema, input))).to.equal(input);
    });
  });
});
