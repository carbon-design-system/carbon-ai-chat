/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Smoke tests for the post-PR-3 `<cds-aichat-input-shell>`. The shell is
 * mostly a thin wrapper around `<cds-aichat-prompt-line>`; deeper editor
 * mechanics (lifecycle, content updates, extensions recreate) are covered
 * by the prompt-line's own tests. These tests verify the chrome-level
 * contracts: forwarding methods, event re-emission, and the
 * `isSendDisabled` gate.
 */

import { expect, fixture, html } from "@open-wc/testing";

// Importing prompt-line explicitly so its custom-element definition is
// installed before any test mounts a shell with a slotted prompt-line child.
import "../prompt-line.js";
import "../input-shell.js";
import type InputShellElement from "../input-shell.js";
import type PromptLineElement from "../prompt-line.js";

async function makeShell(): Promise<InputShellElement> {
  const el = await fixture<InputShellElement>(html`
    <cds-aichat-input-shell aria-label="test"></cds-aichat-input-shell>
  `);
  await el.updateComplete;
  // Allow the inner prompt-line's firstUpdated() to mount its editor.
  await Promise.resolve();
  await el.updateComplete;
  return el;
}

describe("<cds-aichat-input-shell> (post-PR-3)", function () {
  it("mounts a slotted <cds-aichat-prompt-line>", async () => {
    const el = await makeShell();
    const promptLine = el.shadowRoot?.querySelector("cds-aichat-prompt-line");
    expect(promptLine).to.not.equal(null);
  });

  it("getEditor() forwards to the prompt-line", async () => {
    const el = await makeShell();
    const editor = el.getEditor();
    expect(editor).to.not.equal(null);
    expect(typeof editor!.commands.focus).to.equal("function");
  });

  it("setContent / clearContent forward to the prompt-line", async () => {
    const el = await makeShell();
    el.setContent("hello world");
    await el.updateComplete;
    expect(el.getEditor()!.getText()).to.equal("hello world");
    el.clearContent();
    expect(el.getEditor()!.getText()).to.equal("");
  });

  it("re-emits cds-aichat-input-change when the editor content changes", async () => {
    const el = await makeShell();
    let received: { rawValue: string } | null = null;
    el.addEventListener("cds-aichat-input-change", (event) => {
      received = (event as CustomEvent).detail;
    });
    el.getEditor()!.commands.insertContent("typed");
    expect(received).to.not.equal(null);
    expect(received!.rawValue).to.equal("typed");
  });

  it("re-emits cds-aichat-input-focus / cds-aichat-input-blur from the prompt-line", async () => {
    const el = await makeShell();
    const promptLine = el.shadowRoot?.querySelector(
      "cds-aichat-prompt-line",
    ) as PromptLineElement;
    expect(promptLine).to.not.equal(null);

    let focusCount = 0;
    let blurCount = 0;
    el.addEventListener("cds-aichat-input-focus", () => {
      focusCount += 1;
    });
    el.addEventListener("cds-aichat-input-blur", () => {
      blurCount += 1;
    });

    promptLine.dispatchEvent(
      new CustomEvent("cds-aichat-prompt-focus", {
        bubbles: true,
        composed: true,
      }),
    );
    expect(focusCount).to.equal(1);
    expect(blurCount).to.equal(0);

    promptLine.dispatchEvent(
      new CustomEvent("cds-aichat-prompt-blur", {
        bubbles: true,
        composed: true,
      }),
    );
    expect(focusCount).to.equal(1);
    expect(blurCount).to.equal(1);
  });

  it("disabled forwards to the prompt-line", async () => {
    const el = await makeShell();
    expect(el.getEditor()!.isEditable).to.equal(true);
    el.disabled = true;
    await el.updateComplete;
    expect(el.getEditor()!.isEditable).to.equal(false);
  });

  it("isSendDisabled gates send-intent re-dispatch as cds-aichat-input-send", async () => {
    const el = await makeShell();
    el.setContent("hi");
    await el.updateComplete;
    let sendCount = 0;
    el.addEventListener("cds-aichat-input-send", () => {
      sendCount += 1;
    });

    el.isSendDisabled = true;
    await el.updateComplete;
    el.getEditor()!.view.dom.dispatchEvent(
      new CustomEvent("cds-aichat-prompt-send-intent", {
        bubbles: true,
        composed: true,
      }),
    );
    expect(sendCount).to.equal(0);

    el.isSendDisabled = false;
    await el.updateComplete;
    el.getEditor()!.view.dom.dispatchEvent(
      new CustomEvent("cds-aichat-prompt-send-intent", {
        bubbles: true,
        composed: true,
      }),
    );
    expect(sendCount).to.equal(1);
  });

  it("send-intent is suppressed when the editor is empty", async () => {
    const el = await makeShell();
    let sendCount = 0;
    el.addEventListener("cds-aichat-input-send", () => {
      sendCount += 1;
    });
    el.getEditor()!.view.dom.dispatchEvent(
      new CustomEvent("cds-aichat-prompt-send-intent", {
        bubbles: true,
        composed: true,
      }),
    );
    expect(sendCount).to.equal(0);
  });

  it("setting rawValue externally pushes content into the editor", async () => {
    const el = await makeShell();
    el.rawValue = "from outside";
    await el.updateComplete;
    expect(el.getEditor()!.getText()).to.equal("from outside");
  });

  it("overMaxLength flips when rawValue exceeds maxLength", async () => {
    const el = await makeShell();
    el.maxLength = 5;
    await el.updateComplete;
    el.getEditor()!.commands.insertContent("123456");
    await el.updateComplete;
    expect(el.overMaxLength).to.equal(true);
  });

  it("uses a consumer-slotted prompt-line instead of the fallback", async () => {
    const el = await fixture<InputShellElement>(html`
      <cds-aichat-input-shell aria-label="test">
        <cds-aichat-prompt-line slot="editor"></cds-aichat-prompt-line>
      </cds-aichat-input-shell>
    `);
    await el.updateComplete;
    // slotchange is async; wait one microtask plus the slotted child's own
    // updateComplete (the resolver awaits this internally).
    await Promise.resolve();
    await el.updateComplete;

    const slotted = el.querySelector(
      'cds-aichat-prompt-line[slot="editor"]',
    ) as PromptLineElement;
    expect(slotted).to.not.equal(null);
    await slotted.updateComplete;
    expect(el.getEditor()).to.equal(slotted.getEditor());

    // Public methods route to the slotted child.
    el.setContent("from slot");
    await el.updateComplete;
    expect(slotted.getEditor()!.getText()).to.equal("from slot");
  });

  it("rebinds listeners when the slotted prompt-line is swapped", async () => {
    const el = await fixture<InputShellElement>(html`
      <cds-aichat-input-shell aria-label="test">
        <cds-aichat-prompt-line slot="editor"></cds-aichat-prompt-line>
      </cds-aichat-input-shell>
    `);
    await el.updateComplete;
    await Promise.resolve();
    await el.updateComplete;

    const original = el.querySelector(
      'cds-aichat-prompt-line[slot="editor"]',
    ) as PromptLineElement;
    await original.updateComplete;

    let changeCount = 0;
    el.addEventListener("cds-aichat-input-change", () => {
      changeCount += 1;
    });

    // Swap to a fresh prompt-line.
    const replacement = document.createElement(
      "cds-aichat-prompt-line",
    ) as PromptLineElement;
    replacement.setAttribute("slot", "editor");
    el.replaceChild(replacement, original);
    await el.updateComplete;
    await Promise.resolve();
    await replacement.updateComplete;

    expect(el.getEditor()).to.equal(replacement.getEditor());

    // The shell should no longer be wired to the original — a synthetic
    // event on the now-detached original must NOT bubble through the shell.
    original.dispatchEvent(
      new CustomEvent("cds-aichat-prompt-change", {
        detail: { rawValue: "orphan", content: { type: "doc", content: [] } },
        bubbles: true,
        composed: true,
      }),
    );
    expect(changeCount).to.equal(0);

    // Typing in the replacement DOES flow through.
    replacement.getEditor()!.commands.insertContent("live");
    expect(changeCount).to.be.greaterThan(0);
  });
});
