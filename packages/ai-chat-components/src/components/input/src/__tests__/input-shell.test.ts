/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Layout-only smoke tests for `<cds-aichat-input-shell>`. The shell is
 * pure chrome — five named slots, the `rounded` reflection, and a
 * `--has-message-actions` class toggled by the `message-actions` slot's
 * occupancy. Editor / autocomplete / send-gating behaviors are covered by
 * the prompt-line, send-control, and consumer-level tests.
 */

import { expect, fixture, html } from "@open-wc/testing";

import "../input-shell.js";
import type InputShellElement from "../input-shell.js";

describe("<cds-aichat-input-shell>", () => {
  it("renders the layout chrome with named slots", async () => {
    const el: InputShellElement = await fixture(html`
      <cds-aichat-input-shell></cds-aichat-input-shell>
    `);
    await el.updateComplete;

    const slotNames = Array.from(
      el.shadowRoot?.querySelectorAll("slot") ?? [],
    ).map((s) => s.getAttribute("name"));

    expect(slotNames).to.include("editor");
    expect(slotNames).to.include("message-actions");
    expect(slotNames).to.include("file-uploads");
    expect(slotNames).to.include("autocomplete-content");
    expect(slotNames).to.include("field-messaging");
    expect(slotNames).to.include("send-control");
  });

  it("does not render a fallback prompt-line in the editor slot", async () => {
    const el: InputShellElement = await fixture(html`
      <cds-aichat-input-shell></cds-aichat-input-shell>
    `);
    await el.updateComplete;

    const fallback = el.shadowRoot?.querySelector("cds-aichat-prompt-line");
    expect(fallback).to.equal(null);
  });

  it("reflects the `rounded` boolean property to attribute", async () => {
    const el: InputShellElement = await fixture(html`
      <cds-aichat-input-shell></cds-aichat-input-shell>
    `);
    await el.updateComplete;
    expect(el.hasAttribute("rounded")).to.equal(false);

    el.rounded = true;
    await el.updateComplete;
    expect(el.hasAttribute("rounded")).to.equal(true);
  });

  it("toggles the `--has-message-actions` class when message-actions slot is filled", async () => {
    const el: InputShellElement = await fixture(html`
      <cds-aichat-input-shell></cds-aichat-input-shell>
    `);
    await el.updateComplete;

    const container = el.shadowRoot?.querySelector(
      ".cds-aichat--input-container",
    ) as HTMLElement;
    expect(
      container.classList.contains(
        "cds-aichat--input-container--has-message-actions",
      ),
    ).to.equal(false);

    const action = document.createElement("button");
    action.setAttribute("slot", "message-actions");
    el.appendChild(action);
    // slotchange is async — wait one microtask.
    await Promise.resolve();
    await el.updateComplete;

    expect(
      container.classList.contains(
        "cds-aichat--input-container--has-message-actions",
      ),
    ).to.equal(true);

    el.removeChild(action);
    await Promise.resolve();
    await el.updateComplete;

    expect(
      container.classList.contains(
        "cds-aichat--input-container--has-message-actions",
      ),
    ).to.equal(false);
  });

  it("renders consumer-slotted children inside their named slots", async () => {
    const el: InputShellElement = await fixture(html`
      <cds-aichat-input-shell>
        <div slot="editor" id="my-editor"></div>
        <div slot="send-control" id="my-send"></div>
        <div slot="field-messaging" id="my-msg"></div>
      </cds-aichat-input-shell>
    `);
    await el.updateComplete;

    expect(el.querySelector("#my-editor")).to.not.equal(null);
    expect(el.querySelector("#my-send")).to.not.equal(null);
    expect(el.querySelector("#my-msg")).to.not.equal(null);
  });
});
