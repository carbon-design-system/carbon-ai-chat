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

import { inputSchema } from "../prosemirror/schema.js";
import {
  insertAutocompleteItem,
  insertTokenWithRawValue,
} from "../autocomplete-insert.js";
import type { EditorViewManager } from "../editor-view-manager.js";
import {
  SuggestionType,
  type SuggestionConfig,
  type SuggestionItem,
  type TriggerChangeEventDetail,
} from "../types.js";

function makeView(text: string) {
  const doc = inputSchema.nodes.doc.create(null, [
    inputSchema.nodes.paragraph.create(
      null,
      text ? inputSchema.text(text) : undefined,
    ),
  ]);
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  const view = new EditorView(mount, {
    state: EditorState.create({
      doc,
      selection: TextSelection.atEnd(doc),
    }),
  });

  // Create a mock EditorViewManager for testing
  const mockManager = {
    focus: () => true,
  } as EditorViewManager;

  return {
    view,
    manager: mockManager,
    cleanup: () => {
      view.destroy();
      mount.remove();
    },
  };
}

describe("insertAutocompleteItem", () => {
  it("replaces entire text for autocomplete-type triggers using item.value", () => {
    const { view, manager, cleanup } = makeView("old text");
    const trigger: TriggerChangeEventDetail = {
      type: "autocomplete",
      query: "",
      triggerOffset: 0,
    };
    const item: SuggestionItem = {
      id: "1",
      label: "Friendly Label",
      value: "canonical value",
    };

    insertAutocompleteItem(view, item, trigger, [], manager);

    expect(view.state.doc.textContent).to.equal("canonical value");
    cleanup();
  });

  it("falls back to item.label when value is missing (autocomplete)", () => {
    const { view, manager, cleanup } = makeView("x");
    const trigger: TriggerChangeEventDetail = {
      type: "autocomplete",
      query: "",
      triggerOffset: 0,
    };
    insertAutocompleteItem(
      view,
      { id: "1", label: "only-label" },
      trigger,
      [],
      manager,
    );
    expect(view.state.doc.textContent).to.equal("only-label");
    cleanup();
  });

  it("is a no-op for mention-type when no matching config exists", () => {
    const { view, manager, cleanup } = makeView("hello");
    const trigger: TriggerChangeEventDetail = {
      type: "mention",
      query: "",
      triggerOffset: 0,
    };
    insertAutocompleteItem(
      view,
      { id: "1", label: "Jane" },
      trigger,
      [],
      manager,
    );
    expect(view.state.doc.textContent).to.equal("hello");
    cleanup();
  });

  it("is a no-op when triggerState is null", () => {
    const { view, manager, cleanup } = makeView("hello");
    const configs: SuggestionConfig[] = [
      { type: SuggestionType.MENTION, trigger: "@", items: [] },
    ];
    insertAutocompleteItem(
      view,
      { id: "1", label: "Jane" },
      null,
      configs,
      manager,
    );
    expect(view.state.doc.textContent).to.equal("hello");
    cleanup();
  });

  it("replaces entire text for STARTER triggers using item.value", () => {
    const { view, manager, cleanup } = makeView("");
    const trigger: TriggerChangeEventDetail = {
      type: SuggestionType.STARTER,
      query: "",
      triggerOffset: 0,
    };
    const item: SuggestionItem = {
      id: "1",
      label: "Brainstorm ideas",
      value: "Brainstorm ideas for ",
    };
    insertAutocompleteItem(view, item, trigger, [], manager);
    expect(view.state.doc.textContent).to.equal("Brainstorm ideas for ");
    cleanup();
  });
});

describe("insertTokenWithRawValue", () => {
  it("is a no-op when no matching config exists", () => {
    const { view, manager, cleanup } = makeView("hello");
    insertTokenWithRawValue(
      view,
      { id: "1", label: "Jane" },
      "@Jane",
      null,
      [],
      manager,
    );
    expect(view.state.doc.textContent).to.equal("hello");
    cleanup();
  });
});
