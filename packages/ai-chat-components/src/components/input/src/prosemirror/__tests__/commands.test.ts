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
import { insertToken, replaceWithText } from "../commands.js";
import {
  createTriggerPlugin,
  triggerPluginKey,
  type SuggestionConfigsRef,
} from "../trigger-plugin.js";
import type { SuggestionConfig, SuggestionItem } from "../../types.js";

function makeView(rawText: string, configs: SuggestionConfig[]) {
  const doc = inputSchema.nodes.doc.create(null, [
    inputSchema.nodes.paragraph.create(
      null,
      rawText.length > 0 ? inputSchema.text(rawText) : undefined,
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
  // Kick the trigger plugin: its `apply` only runs on doc/selection changes,
  // and init() returns null. Dispatch a no-op selection tr to force detection.
  view.dispatch(
    view.state.tr.setSelection(TextSelection.atEnd(view.state.doc)),
  );
  return {
    view,
    cleanup: () => {
      view.destroy();
      mount.remove();
    },
  };
}

describe("prosemirror/commands", function () {
  describe("insertToken", function () {
    it("returns false when no trigger is active", () => {
      const { view, cleanup } = makeView("hello", []);
      const item: SuggestionItem = { id: "1", label: "Jane" };
      const config: SuggestionConfig = { trigger: "@", type: "mention" };
      expect(insertToken(view, item, config)).to.equal(false);
      cleanup();
    });

    it("replaces the trigger+query with a token node and dismisses the trigger", () => {
      const config: SuggestionConfig = { trigger: "@", type: "mention" };
      const { view, cleanup } = makeView("hi @Ja", [config]);

      // Trigger plugin should have picked up the @Ja
      const triggerState = triggerPluginKey.getState(view.state);
      expect(triggerState).to.not.equal(null);

      const item: SuggestionItem = {
        id: "1",
        label: "Jane",
        value: "@Jane Smith",
      };
      const ok = insertToken(view, item, config);
      expect(ok).to.equal(true);

      const p = view.state.doc.firstChild!;
      // Expect: "hi " text, then token, then " "
      expect(p.childCount).to.equal(3);
      expect(p.child(0).text).to.equal("hi ");
      expect(p.child(1).type.name).to.equal("token");
      expect(p.child(1).attrs.value).to.equal("@Jane Smith");
      expect(p.child(2).text).to.equal(" ");

      // Trigger should be dismissed
      expect(triggerPluginKey.getState(view.state)).to.equal(null);
      cleanup();
    });
  });

  describe("replaceWithText", function () {
    it("replaces the entire document with the given text", () => {
      const { view, cleanup } = makeView("old content", []);
      const ok = replaceWithText(view, "new content");
      expect(ok).to.equal(true);
      expect(view.state.doc.textContent).to.equal("new content");
      expect(view.state.doc.childCount).to.equal(1);
      cleanup();
    });

    it("replacing with an empty string leaves an empty paragraph", () => {
      const { view, cleanup } = makeView("something", []);
      replaceWithText(view, "");
      expect(view.state.doc.childCount).to.equal(1);
      expect(view.state.doc.firstChild!.childCount).to.equal(0);
      cleanup();
    });
  });
});
