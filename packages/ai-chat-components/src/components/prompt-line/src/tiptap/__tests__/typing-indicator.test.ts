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

import { setHostOriginMeta } from "../origin-meta.js";
import {
  TypingIndicator,
  type TypingIndicatorStorage,
} from "../typing-indicator.js";

function makeEditor() {
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  const editor = new Editor({
    element: mount,
    extensions: [DocumentNode, ParagraphNode, TextNode, TypingIndicator],
    content: "",
  });
  const events: { isTyping: boolean }[] = [];
  editor.view.dom.addEventListener("cds-aichat-prompt-typing", (e) => {
    events.push((e as CustomEvent).detail);
  });
  return {
    editor,
    events,
    cleanup: () => {
      editor.destroy();
      mount.remove();
    },
  };
}

describe("tiptap/typing-indicator", function () {
  it("emits isTyping=true on user-driven doc change", () => {
    const { editor, events, cleanup } = makeEditor();

    editor.commands.insertContent("hi");

    expect(events.length).to.equal(1);
    expect(events[0].isTyping).to.equal(true);
    cleanup();
  });

  it("does NOT emit isTyping=true when the tr carries host-origin meta", () => {
    const { editor, events, cleanup } = makeEditor();

    const tr = editor.state.tr.insertText("hi");
    setHostOriginMeta(tr);
    editor.view.dispatch(tr);

    expect(events.length).to.equal(0);
    cleanup();
  });

  it("keeps subsequent user input emitting after a host-origin batch", () => {
    const { editor, events, cleanup } = makeEditor();

    const tr = editor.state.tr.insertText("hi");
    setHostOriginMeta(tr);
    editor.view.dispatch(tr);
    expect(events.length).to.equal(0);

    editor.commands.insertContent(" you");
    expect(events.length).to.equal(1);
    expect(events[0].isTyping).to.equal(true);
    cleanup();
  });

  it("storage.reset() emits isTyping=false when currently typing", () => {
    const { editor, events, cleanup } = makeEditor();
    const storage = editor.extensionStorage
      .carbonTypingIndicator as TypingIndicatorStorage;

    editor.commands.insertContent("hi");
    expect(events.length).to.equal(1);

    storage.reset();
    expect(events.length).to.equal(2);
    expect(events[1].isTyping).to.equal(false);
    cleanup();
  });
});
