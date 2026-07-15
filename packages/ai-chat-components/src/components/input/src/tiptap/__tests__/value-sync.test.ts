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
import { ValueSync, type ValueSyncStorage } from "../value-sync.js";

function makeEditor() {
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  const editor = new Editor({
    element: mount,
    extensions: [DocumentNode, ParagraphNode, TextNode, ValueSync],
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

describe("tiptap/value-sync", function () {
  it("emits cds-aichat-prompt-change with rawValue and content on doc change", () => {
    const { editor, cleanup } = makeEditor();
    let received: { rawValue: string; content: unknown } | null = null;
    editor.view.dom.addEventListener("cds-aichat-prompt-change", (e) => {
      received = (e as CustomEvent).detail;
    });

    editor.commands.insertContent("hi");

    expect(received).to.not.equal(null);
    expect(received!.rawValue).to.equal("hi");
    expect(typeof received!.content).to.equal("object");
    cleanup();
  });

  it("flips storage.lastTransactionIsHost when the dispatched tr carries host-origin meta", () => {
    const { editor, cleanup } = makeEditor();
    const storage = editor.extensionStorage.carbonValueSync as ValueSyncStorage;
    expect(storage.lastTransactionIsHost).to.equal(false);

    const tr = editor.state.tr.insertText("x");
    setHostOriginMeta(tr);
    editor.view.dispatch(tr);

    expect(storage.lastTransactionIsHost).to.equal(true);
    cleanup();
  });

  it("keeps lastTransactionIsHost false for plain user transactions", () => {
    const { editor, cleanup } = makeEditor();
    const storage = editor.extensionStorage.carbonValueSync as ValueSyncStorage;

    editor.commands.insertContent("x");

    expect(storage.lastTransactionIsHost).to.equal(false);
    cleanup();
  });
});
