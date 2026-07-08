/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Layout-only smoke tests for `<cds-aichat-prompt-line-shell>`. The shell is
 * pure chrome — five named slots, the `rounded` reflection, and a
 * `--has-message-actions` class toggled by the `message-actions` slot's
 * occupancy. Editor / autocomplete / send-gating behaviors are covered by
 * the prompt-line, send-control, and consumer-level tests.
 */

import { expect, fixture, html } from "@open-wc/testing";

import "../prompt-line-shell.js";
import type PromptLineShellElement from "../prompt-line-shell.js";

describe("<cds-aichat-prompt-line-shell>", () => {
  it("renders the layout chrome with named slots", async () => {
    const el: PromptLineShellElement = await fixture(html`
      <cds-aichat-prompt-line-shell></cds-aichat-prompt-line-shell>
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
    const el: PromptLineShellElement = await fixture(html`
      <cds-aichat-prompt-line-shell></cds-aichat-prompt-line-shell>
    `);
    await el.updateComplete;

    const fallback = el.shadowRoot?.querySelector("cds-aichat-prompt-line");
    expect(fallback).to.equal(null);
  });

  it("reflects the `rounded` boolean property to attribute", async () => {
    const el: PromptLineShellElement = await fixture(html`
      <cds-aichat-prompt-line-shell></cds-aichat-prompt-line-shell>
    `);
    await el.updateComplete;
    expect(el.hasAttribute("rounded")).to.equal(false);

    el.rounded = true;
    await el.updateComplete;
    expect(el.hasAttribute("rounded")).to.equal(true);
  });

  it("reflects the `expanded` boolean property to attribute", async () => {
    const el: PromptLineShellElement = await fixture(html`
      <cds-aichat-prompt-line-shell></cds-aichat-prompt-line-shell>
    `);
    await el.updateComplete;
    expect(el.hasAttribute("expanded")).to.equal(false);

    el.expanded = true;
    await el.updateComplete;
    expect(el.hasAttribute("expanded")).to.equal(true);
  });

  it("toggles the `--expanded` container class with the `expanded` property", async () => {
    const el: PromptLineShellElement = await fixture(html`
      <cds-aichat-prompt-line-shell></cds-aichat-prompt-line-shell>
    `);
    await el.updateComplete;

    const container = el.shadowRoot?.querySelector(
      ".cds-aichat--input-container",
    ) as HTMLElement;
    expect(
      container.classList.contains("cds-aichat--input-container--expanded"),
    ).to.equal(false);

    el.expanded = true;
    await el.updateComplete;
    expect(
      container.classList.contains("cds-aichat--input-container--expanded"),
    ).to.equal(true);

    el.expanded = false;
    await el.updateComplete;
    expect(
      container.classList.contains("cds-aichat--input-container--expanded"),
    ).to.equal(false);
  });

  it("toggles the `--has-message-actions` class when message-actions slot is filled", async () => {
    const el: PromptLineShellElement = await fixture(html`
      <cds-aichat-prompt-line-shell></cds-aichat-prompt-line-shell>
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

  it("ignores writeable passthrough slots when toggling `--has-message-actions`", async () => {
    const el: PromptLineShellElement = await fixture(html`
      <cds-aichat-prompt-line-shell></cds-aichat-prompt-line-shell>
    `);
    await el.updateComplete;

    const container = el.shadowRoot?.querySelector(
      ".cds-aichat--input-container",
    ) as HTMLElement;

    // A passthrough alone (marked) must not count as real action content.
    const passthrough = document.createElement("div");
    passthrough.setAttribute("slot", "message-actions");
    passthrough.setAttribute("data-prompt-line-slot", "");
    el.appendChild(passthrough);
    await Promise.resolve();
    await el.updateComplete;

    expect(
      container.classList.contains(
        "cds-aichat--input-container--has-message-actions",
      ),
    ).to.equal(false);

    // A real action alongside the passthrough flips the class on.
    const action = document.createElement("button");
    action.setAttribute("slot", "message-actions");
    el.appendChild(action);
    await Promise.resolve();
    await el.updateComplete;

    expect(
      container.classList.contains(
        "cds-aichat--input-container--has-message-actions",
      ),
    ).to.equal(true);
  });

  it("reconciles a stale `--has-message-actions` against the settled assignment on the next render", async () => {
    const el: PromptLineShellElement = await fixture(html`
      <cds-aichat-prompt-line-shell></cds-aichat-prompt-line-shell>
    `);
    await el.updateComplete;

    const container = el.shadowRoot?.querySelector(
      ".cds-aichat--input-container",
    ) as HTMLElement;
    const hasMessageActions = () =>
      container.classList.contains(
        "cds-aichat--input-container--has-message-actions",
      );

    // A real action turns the padding treatment on.
    const action = document.createElement("button");
    action.setAttribute("slot", "message-actions");
    el.appendChild(action);
    await Promise.resolve();
    await el.updateComplete;
    expect(hasMessageActions()).to.equal(true);

    // It becomes a passthrough via an attribute-only change, which emits no
    // `slotchange`, so the slotchange-driven snapshot is now stale (a stand-in
    // for the transient miscount an async/runtime projection can leave behind).
    action.setAttribute("data-prompt-line-slot", "");
    expect(hasMessageActions()).to.equal(true);

    // Any subsequent render reconciles against the settled assignment.
    el.requestUpdate();
    await el.updateComplete;
    await el.updateComplete;
    expect(hasMessageActions()).to.equal(false);
  });

  it("renders consumer-slotted children inside their named slots", async () => {
    const el: PromptLineShellElement = await fixture(html`
      <cds-aichat-prompt-line-shell>
        <div slot="editor" id="my-editor"></div>
        <div slot="send-control" id="my-send"></div>
        <div slot="field-messaging" id="my-msg"></div>
      </cds-aichat-prompt-line-shell>
    `);
    await el.updateComplete;

    expect(el.querySelector("#my-editor")).to.not.equal(null);
    expect(el.querySelector("#my-send")).to.not.equal(null);
    expect(el.querySelector("#my-msg")).to.not.equal(null);
  });
});
