/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect } from "@open-wc/testing";
import { EditorState, TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { inputSchema } from "../schema.js";
import {
  buildTextBefore,
  createTriggerPlugin,
  detectTrigger,
  matchConfig,
  triggerPluginKey,
  type SuggestionConfigsRef,
} from "../trigger-plugin.js";
import {
  SuggestionType,
  type AutocompleteConfig,
  type CommandConfig,
  type MentionConfig,
  type StarterConfig,
  type SuggestionConfig,
} from "../../types.js";

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
    const mention: MentionConfig = {
      type: SuggestionType.MENTION,
      trigger: "@",
      items: [],
    };
    const command: CommandConfig = {
      type: SuggestionType.COMMAND,
      trigger: "/",
      triggerPosition: "start",
      items: [],
    };
    const auto: AutocompleteConfig = {
      type: SuggestionType.AUTOCOMPLETE,
      items: [],
    };
    const starter: StarterConfig = {
      type: SuggestionType.STARTER,
      items: [],
    };

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

    it("autocomplete returns the whole textBefore as query", () => {
      expect(matchConfig(auto, "hello")).to.deep.equal({
        type: "autocomplete",
        query: "hello",
        triggerOffsetInText: 0,
      });
    });

    it("autocomplete returns null when there is no text", () => {
      expect(matchConfig(auto, "")).to.equal(null);
    });

    it("starter never matches via matchConfig (handled by detectTrigger)", () => {
      expect(matchConfig(starter, "")).to.equal(null);
      expect(matchConfig(starter, "hello")).to.equal(null);
    });
  });

  describe("detectTrigger / STARTER", function () {
    function makeState(text: string, configs: SuggestionConfig[]) {
      const doc = inputSchema.nodes.doc.create(null, [
        inputSchema.nodes.paragraph.create(
          null,
          text.length > 0 ? inputSchema.text(text) : undefined,
        ),
      ]);
      const state = EditorState.create({
        doc,
        selection: TextSelection.atEnd(doc),
      });
      return { state, configs };
    }

    const starter: StarterConfig = {
      type: SuggestionType.STARTER,
      items: [],
    };
    const mention: MentionConfig = {
      type: SuggestionType.MENTION,
      trigger: "@",
      items: [],
    };
    const auto: AutocompleteConfig = {
      type: SuggestionType.AUTOCOMPLETE,
      items: [],
    };

    it("fires synthetic STARTER on empty + focused + editable", () => {
      const { state, configs } = makeState("", [starter]);
      const result = detectTrigger(state, configs, true, true);
      expect(result).to.deep.equal({
        type: SuggestionType.STARTER,
        query: "",
        triggerOffset: 1,
      });
    });

    it("does not fire on empty when no STARTER config is registered", () => {
      const { state, configs } = makeState("", [auto, mention]);
      expect(detectTrigger(state, configs, true, true)).to.equal(null);
    });

    it("does not fire on empty when blurred", () => {
      const { state, configs } = makeState("", [starter]);
      expect(detectTrigger(state, configs, false, true)).to.equal(null);
    });

    it("does not fire on empty when not editable", () => {
      const { state, configs } = makeState("", [starter]);
      expect(detectTrigger(state, configs, true, false)).to.equal(null);
    });

    it("STARTER closes once text is typed (autocomplete takes over if registered)", () => {
      const { state, configs } = makeState("h", [starter, auto]);
      const result = detectTrigger(state, configs, true, true);
      expect(result).to.deep.equal({
        type: SuggestionType.AUTOCOMPLETE,
        query: "h",
        triggerOffset: 1,
      });
    });

    it("STARTER closes once text is typed (no other config -> null)", () => {
      const { state, configs } = makeState("h", [starter]);
      expect(detectTrigger(state, configs, true, true)).to.equal(null);
    });
  });

  describe("createTriggerPlugin / focus + blur", function () {
    function makeView(text: string, configs: SuggestionConfig[]) {
      const doc = inputSchema.nodes.doc.create(null, [
        inputSchema.nodes.paragraph.create(
          null,
          text.length > 0 ? inputSchema.text(text) : undefined,
        ),
      ]);
      const configsRef: SuggestionConfigsRef = { current: configs };
      const state = EditorState.create({
        doc,
        plugins: [createTriggerPlugin(configsRef)],
        selection: TextSelection.atEnd(doc),
      });
      const mount = document.createElement("div");
      document.body.appendChild(mount);
      const view = new EditorView(mount, { state });
      return {
        view,
        cleanup: () => {
          view.destroy();
          mount.remove();
        },
      };
    }

    const starter: StarterConfig = {
      type: SuggestionType.STARTER,
      items: [],
    };

    it("emits synthetic STARTER state when the editor receives focus on an empty doc", () => {
      const { view, cleanup } = makeView("", [starter]);
      view.focus();
      const triggerState = triggerPluginKey.getState(view.state);
      expect(triggerState).to.deep.equal({
        type: SuggestionType.STARTER,
        query: "",
        triggerOffset: 1,
      });
      cleanup();
    });

    it("clears synthetic STARTER state on blur", () => {
      const { view, cleanup } = makeView("", [starter]);
      view.focus();
      expect(triggerPluginKey.getState(view.state)).to.not.equal(null);
      view.dom.blur();
      expect(triggerPluginKey.getState(view.state)).to.equal(null);
      cleanup();
    });
  });
});
