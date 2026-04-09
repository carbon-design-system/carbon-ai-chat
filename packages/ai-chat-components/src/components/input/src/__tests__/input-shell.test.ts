/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect, fixture, html } from "@open-wc/testing";

import "../input-shell.js";
import type { InputShellElement } from "../input-shell.js";
import type { SendEventDetail } from "../types.js";

async function makeShell(
  props: Partial<{ disabled: boolean; rawValue: string }> = {},
): Promise<InputShellElement> {
  const el = await fixture<InputShellElement>(
    html`<cds-aichat-input-shell
      ?disabled=${props.disabled ?? false}
      .rawValue=${props.rawValue ?? ""}
    ></cds-aichat-input-shell>`,
  );
  return el;
}

describe("cds-aichat-input-shell", () => {
  it("renders with default properties", async () => {
    const el = await makeShell();
    expect(el.disabled).to.equal(false);
    expect(el.rawValue).to.equal("");
    expect(el.hasValidInput).to.equal(false);
  });

  it("creates an editor container in light DOM", async () => {
    const el = await makeShell();
    // Editor container is appended as a light-DOM child with slot="editor".
    const editor = el.querySelector('[slot="editor"]');
    expect(editor).to.not.equal(null);
  });

  it("hasValidInput reflects trimmed rawValue", async () => {
    const el = await makeShell({ rawValue: "  hi  " });
    expect(el.hasValidInput).to.equal(true);
    el.rawValue = "   ";
    expect(el.hasValidInput).to.equal(false);
  });

  it("does not emit send when input is empty", async () => {
    const el = await makeShell();
    let fired = 0;
    el.addEventListener("cds-aichat-input-send", () => {
      fired += 1;
    });
    (el as any)._handleSend();
    expect(fired).to.equal(0);
  });

  it("does not emit send when disabled", async () => {
    const el = await makeShell({ disabled: true, rawValue: "hello" });
    let fired = 0;
    el.addEventListener("cds-aichat-input-send", () => {
      fired += 1;
    });
    (el as any)._handleSend();
    expect(fired).to.equal(0);
  });

  it("emits send with trimmed text on valid input", async () => {
    const el = await makeShell({ rawValue: "  hello world  " });
    let detail: SendEventDetail | null = null;
    el.addEventListener("cds-aichat-input-send", (e) => {
      detail = (e as CustomEvent<SendEventDetail>).detail;
    });
    (el as any)._handleSend();
    expect(detail).to.deep.equal({ text: "hello world" });
  });

  it("hasFocus() reflects :focus-within on the host", async () => {
    const el = await makeShell();
    expect(el.hasFocus()).to.equal(false);
    el.requestFocus();
    expect(el.hasFocus()).to.equal(true);
    (document.activeElement as HTMLElement | null)?.blur();
    expect(el.hasFocus()).to.equal(false);
  });

  it("dismissTrigger clears the active trigger state", async () => {
    const el = await makeShell();
    (el as any)._triggerState = {
      type: "mention",
      query: "",
      triggerOffset: 0,
    };
    el.dismissTrigger();
    expect((el as any)._triggerState).to.equal(null);
  });

  it("tears down the editor on disconnect", async () => {
    const el = await makeShell();
    expect(el.querySelector('[slot="editor"]')).to.not.equal(null);
    el.remove();
    expect(el.querySelector('[slot="editor"]')).to.equal(null);
  });
});
