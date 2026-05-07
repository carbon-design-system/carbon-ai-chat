/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect } from "@open-wc/testing";
import { Editor } from "@tiptap/core";
import DocumentNode from "@tiptap/extension-document";
import ParagraphNode from "@tiptap/extension-paragraph";
import TextNode from "@tiptap/extension-text";

import { dispatchTriggerChange } from "../trigger-utils.js";
import type { TriggerChangeEventDetail } from "../types.js";

function makeEditor() {
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  const editor = new Editor({
    element: mount,
    extensions: [DocumentNode, ParagraphNode, TextNode],
    content: "",
  });
  return {
    editor,
    cleanup: () => {
      editor.destroy();
      mount.remove();
    },
  };
}

describe("tiptap/trigger-utils", function () {
  it("dispatches cds-aichat-trigger-change on the editor DOM with the supplied detail", () => {
    const { editor, cleanup } = makeEditor();
    let received: TriggerChangeEventDetail | null | undefined = undefined;
    editor.view.dom.addEventListener("cds-aichat-trigger-change", (event) => {
      received = (event as CustomEvent).detail;
    });

    dispatchTriggerChange(editor, {
      type: "mention",
      query: "alic",
      triggerOffset: 1,
    });

    expect(received).to.deep.equal({
      type: "mention",
      query: "alic",
      triggerOffset: 1,
    });
    cleanup();
  });

  it("coalesces no-op transitions: identical detail does not re-emit", () => {
    const { editor, cleanup } = makeEditor();
    let count = 0;
    editor.view.dom.addEventListener("cds-aichat-trigger-change", () => {
      count += 1;
    });

    const detail = {
      type: "command" as const,
      query: "search",
      triggerOffset: 1,
    };
    dispatchTriggerChange(editor, detail);
    dispatchTriggerChange(editor, { ...detail });
    expect(count).to.equal(1);

    dispatchTriggerChange(editor, { ...detail, query: "search " });
    expect(count).to.equal(2);
    cleanup();
  });

  it("emits null after a non-null transition", () => {
    const { editor, cleanup } = makeEditor();
    const events: (TriggerChangeEventDetail | null)[] = [];
    editor.view.dom.addEventListener("cds-aichat-trigger-change", (event) => {
      events.push((event as CustomEvent).detail);
    });

    dispatchTriggerChange(editor, {
      type: "autocomplete",
      query: "hi",
      triggerOffset: 1,
    });
    dispatchTriggerChange(editor, null);
    dispatchTriggerChange(editor, null);

    expect(events).to.have.lengthOf(2);
    expect(events[0]).to.not.equal(null);
    expect(events[1]).to.equal(null);
    cleanup();
  });
});
