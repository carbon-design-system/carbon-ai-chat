/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect } from "@open-wc/testing";
import { Schema } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";

import { isHostOrigin, setHostOriginMeta } from "../origin-meta.js";

const minimalSchema = new Schema({
  nodes: {
    doc: { content: "paragraph+" },
    paragraph: { content: "text*", group: "block" },
    text: { group: "inline" },
  },
});

describe("tiptap/origin-meta", function () {
  function makeTr() {
    const doc = minimalSchema.nodes.doc.create(null, [
      minimalSchema.nodes.paragraph.create(),
    ]);
    return EditorState.create({ doc, plugins: [] }).tr;
  }

  it("setHostOriginMeta tags the transaction so isHostOrigin returns true", () => {
    const tr = makeTr();
    expect(isHostOrigin(tr)).to.equal(false);
    setHostOriginMeta(tr);
    expect(isHostOrigin(tr)).to.equal(true);
  });

  it("returns the same transaction for chaining", () => {
    const tr = makeTr();
    expect(setHostOriginMeta(tr)).to.equal(tr);
  });

  it("untagged transactions are not host-origin", () => {
    expect(isHostOrigin(makeTr())).to.equal(false);
  });
});
