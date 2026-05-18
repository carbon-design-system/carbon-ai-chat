/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect, fixture, html } from "@open-wc/testing";

import "../prompt-line.js";
import type PromptLineElement from "../prompt-line.js";

async function makePromptLine(
  attrs: Partial<{
    disabled: boolean;
    placeholder: string;
    ariaLabel: string;
  }> = {},
): Promise<PromptLineElement> {
  const el = await fixture<PromptLineElement>(html`
    <cds-aichat-prompt-line
      ?disabled=${attrs.disabled ?? false}
      placeholder=${attrs.placeholder ?? ""}
      aria-label=${attrs.ariaLabel ?? "test prompt"}
    ></cds-aichat-prompt-line>
  `);
  // Ensure the editor has finished mounting (firstUpdated awaits a microtask).
  await el.updateComplete;
  await Promise.resolve();
  return el;
}

describe("<cds-aichat-prompt-line>", function () {
  it("mounts a Tiptap editor reachable via getEditor()", async () => {
    const el = await makePromptLine();
    const editor = el.getEditor();
    expect(editor).to.not.equal(null);
    expect(typeof editor!.commands.focus).to.equal("function");
  });

  it("projects the editor host into light DOM with slot=editor", async () => {
    const el = await makePromptLine();
    const slottedHost = el.querySelector('[slot="editor"]') as HTMLElement;
    expect(slottedHost).to.not.equal(null);
    expect(slottedHost.dataset.aichatEditorHost).to.equal("");
    // Tiptap mounts contenteditable inside the host.
    expect(slottedHost.querySelector(".ProseMirror")).to.not.equal(null);
  });

  it("clearContent empties the doc", async () => {
    const el = await makePromptLine();
    el.setContent("hello");
    expect(el.getEditor()!.getText()).to.equal("hello");
    el.clearContent();
    expect(el.getEditor()!.getText()).to.equal("");
  });

  it("setContent accepts a string and routes through the editor", async () => {
    const el = await makePromptLine();
    el.setContent("alpha");
    expect(el.getEditor()!.getText()).to.equal("alpha");
  });

  it("setContent accepts an updater function", async () => {
    const el = await makePromptLine();
    el.setContent("first");
    el.setContent((prev) => {
      // prev is JSONContent; we can produce a fresh JSON.
      void prev;
      return {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "second" }] },
        ],
      };
    });
    expect(el.getEditor()!.getText()).to.equal("second");
  });

  it("insertContent appends text", async () => {
    const el = await makePromptLine();
    el.setContent("a");
    el.getEditor()!.commands.focus("end");
    el.insertContent("b");
    expect(el.getEditor()!.getText()).to.equal("ab");
  });

  it("disabled toggles editor.setEditable", async () => {
    const el = await makePromptLine();
    expect(el.getEditor()!.isEditable).to.equal(true);
    el.disabled = true;
    await el.updateComplete;
    expect(el.getEditor()!.isEditable).to.equal(false);
    el.disabled = false;
    await el.updateComplete;
    expect(el.getEditor()!.isEditable).to.equal(true);
  });

  it("destroys the editor on disconnectedCallback", async () => {
    const el = await makePromptLine();
    expect(el.getEditor()).to.not.equal(null);
    el.remove();
    expect(el.getEditor()).to.equal(null);
  });

  it("recreates the editor when extensions reference changes; preserves text", async () => {
    const el = await makePromptLine();
    el.setContent("survives recreate");
    const firstEditor = el.getEditor();

    el.extensions = [...el.extensions];
    await el.updateComplete;

    const secondEditor = el.getEditor();
    expect(secondEditor).to.not.equal(firstEditor);
    expect(secondEditor!.getText()).to.equal("survives recreate");
  });

  it("emits cds-aichat-prompt-change when typing", async () => {
    const el = await makePromptLine();
    let received: { rawValue: string } | null = null;
    el.addEventListener("cds-aichat-prompt-change", (event) => {
      received = (event as CustomEvent).detail;
    });
    el.getEditor()!.commands.insertContent("typed");
    expect(received).to.not.equal(null);
    expect(received!.rawValue).to.equal("typed");
  });
});
