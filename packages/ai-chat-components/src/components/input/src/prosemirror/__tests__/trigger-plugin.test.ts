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
import { buildTextBefore, matchConfig } from "../trigger-plugin.js";
import type { SuggestionConfig } from "../../types.js";

function paragraphWith(...children: Parameters<typeof Array.prototype.concat>) {
  return inputSchema.nodes.paragraph.create(null, children as never);
}

function tokenNode(value: string) {
  return inputSchema.nodes.token.create({
    id: "id",
    label: value,
    type: "mention",
    value,
    data: null,
  });
}

describe("prosemirror/trigger-plugin", function () {
  describe("buildTextBefore", function () {
    it("returns empty results for an empty paragraph", () => {
      const p = inputSchema.nodes.paragraph.create();
      const { textBefore, posMap } = buildTextBefore(p, 0);
      expect(textBefore).to.equal("");
      expect(posMap).to.deep.equal([]);
    });

    it("returns text content and 1:1 posMap for plain text", () => {
      const p = paragraphWith(inputSchema.text("hello"));
      const { textBefore, posMap } = buildTextBefore(p, 5);
      expect(textBefore).to.equal("hello");
      expect(posMap).to.deep.equal([0, 1, 2, 3, 4]);
    });

    it("slices text at the cursor offset", () => {
      const p = paragraphWith(inputSchema.text("hello world"));
      const { textBefore } = buildTextBefore(p, 5);
      expect(textBefore).to.equal("hello");
    });

    it("expands token atoms into their value characters and maps all to the token's start offset", () => {
      const p = paragraphWith(
        inputSchema.text("hi "),
        tokenNode("@Jane"),
        inputSchema.text(" "),
      );
      const { textBefore, posMap } = buildTextBefore(p, p.content.size);
      expect(textBefore).to.equal("hi @Jane ");
      expect(posMap.slice(0, 3)).to.deep.equal([0, 1, 2]);
      expect(posMap.slice(3, 8)).to.deep.equal([3, 3, 3, 3, 3]);
      expect(posMap[8]).to.equal(4);
    });
  });

  describe("matchConfig", function () {
    const mention: SuggestionConfig = { trigger: "@", type: "mention" };
    const command: SuggestionConfig = {
      trigger: "/",
      type: "command",
      triggerPosition: "start",
    };
    const auto: SuggestionConfig = { trigger: "", type: "autocomplete" };

    it("returns null when the trigger character is absent", () => {
      expect(matchConfig(mention, "hello world")).to.equal(null);
    });

    it("matches a char trigger at the start of the line", () => {
      const match = matchConfig(mention, "@Jan");
      expect(match).to.deep.equal({
        type: "mention",
        query: "Jan",
        triggerOffsetInText: 0,
      });
    });

    it("matches a char trigger preceded by whitespace", () => {
      const match = matchConfig(mention, "hi @Jan");
      expect(match).to.deep.equal({
        type: "mention",
        query: "Jan",
        triggerOffsetInText: 3,
      });
    });

    it("does not match a char trigger preceded by non-whitespace", () => {
      expect(matchConfig(mention, "email@Jan")).to.equal(null);
    });

    it("rejects queries containing whitespace", () => {
      expect(matchConfig(mention, "@Jan Smith")).to.equal(null);
    });

    it("with triggerPosition:start requires the trigger at line start", () => {
      expect(matchConfig(command, "/sum")).to.deep.equal({
        type: "command",
        query: "sum",
        triggerOffsetInText: 0,
      });
      expect(matchConfig(command, "hi /sum")).to.equal(null);
    });

    it("with triggerPosition:start allows leading whitespace before the trigger", () => {
      expect(matchConfig(command, "  /sum")).to.deep.equal({
        type: "command",
        query: "sum",
        triggerOffsetInText: 2,
      });
    });

    it("empty trigger returns the whole textBefore as query", () => {
      expect(matchConfig(auto, "hello")).to.deep.equal({
        type: "autocomplete",
        query: "hello",
        triggerOffsetInText: 0,
      });
    });

    it("empty trigger returns null when there is no text", () => {
      expect(matchConfig(auto, "")).to.equal(null);
    });
  });
});
