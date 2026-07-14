/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect, fixture, html, oneEvent } from "@open-wc/testing";
import { Extension } from "@tiptap/core";

import "../prompt-line.js";
import { PROMPT_LINE_MAX_BLOCK_SIZE } from "../prompt-line-constants.js";
import type PromptLineElement from "../prompt-line.js";
import { carbonMention } from "../tiptap/carbon-mention.js";
import type { SuggestionItem } from "../tiptap/types.js";

async function makePromptLine(
  attrs: Partial<{
    disabled: boolean;
    placeholder: string;
    ariaLabel: string;
    rich: boolean;
    testId: string;
  }> = {},
): Promise<PromptLineElement> {
  const el = await fixture<PromptLineElement>(html`
    <cds-aichat-prompt-line
      ?disabled=${attrs.disabled ?? false}
      ?rich=${attrs.rich ?? false}
      placeholder=${attrs.placeholder ?? ""}
      aria-label=${attrs.ariaLabel ?? "test prompt"}
      test-id=${attrs.testId ?? ""}
    ></cds-aichat-prompt-line>
  `);
  await el.updateComplete;
  await Promise.resolve();
  return el;
}

function getTextarea(el: PromptLineElement): HTMLTextAreaElement {
  return el.querySelector('[slot="editor"] textarea') as HTMLTextAreaElement;
}

/** Type text by setting the value and firing the native `input` event. */
function typeInto(el: PromptLineElement, value: string): void {
  const ta = getTextarea(el);
  ta.value = value;
  ta.dispatchEvent(new InputEvent("input", { bubbles: true }));
}

/**
 * Poll until the rich editor has finished loading + mounting. Tiptap is loaded
 * via a lazy `import()` (see #1578), so the first upgrade in a test file pays a
 * cold-load cost that can approach a couple seconds on Chromium — poll long
 * enough to cover it (the runner's Mocha timeout is raised to match in
 * web-test-runner.config.js).
 */
async function waitForRich(el: PromptLineElement): Promise<void> {
  for (let i = 0; i < 500; i += 1) {
    if (el.getEditor()) {
      return;
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("rich editor did not load");
}

describe("<cds-aichat-prompt-line> (textarea mode)", function () {
  it("renders a textarea and getEditor() is null", async () => {
    const el = await makePromptLine();
    expect(getTextarea(el)).to.not.equal(null);
    expect(el.getEditor()).to.equal(null);
  });

  it("caps the textarea height and scrolls past the cap", async () => {
    const el = await makePromptLine();
    const ta = getTextarea(el);
    const style = getComputedStyle(ta);
    expect(style.maxHeight).to.equal(PROMPT_LINE_MAX_BLOCK_SIZE);
    expect(style.overflowY).to.equal("auto");
  });

  it("projects the editor host into light DOM with slot=editor", async () => {
    const el = await makePromptLine();
    const host = el.querySelector('[slot="editor"]') as HTMLElement;
    expect(host).to.not.equal(null);
    expect(host.dataset.aichatEditorHost).to.equal("");
    expect(host.querySelector("textarea")).to.not.equal(null);
  });

  it("applies test-id to the textarea (Playwright .fill target)", async () => {
    const el = await makePromptLine({ testId: "input_field" });
    expect(getTextarea(el).getAttribute("data-testid")).to.equal("input_field");
  });

  it("setContent / clearContent / insertContent drive the value", async () => {
    const el = await makePromptLine();
    el.setContent("alpha");
    expect(getTextarea(el).value).to.equal("alpha");
    el.setContent((prev) => {
      void prev;
      return {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "beta" }] },
        ],
      };
    });
    expect(getTextarea(el).value).to.equal("beta");
    el.clearContent();
    expect(getTextarea(el).value).to.equal("");
    getTextarea(el).setSelectionRange(0, 0);
    el.setContent("ac");
    getTextarea(el).setSelectionRange(1, 1);
    el.insertContent("b");
    expect(getTextarea(el).value).to.equal("abc");
  });

  it("emits cds-aichat-prompt-change with rawValue on input", async () => {
    const el = await makePromptLine();
    let received: { rawValue: string } | null = null;
    el.addEventListener("cds-aichat-prompt-change", (event) => {
      received = (event as CustomEvent).detail;
    });
    typeInto(el, "typed");
    expect(received).to.not.equal(null);
    expect(received!.rawValue).to.equal("typed");
  });

  it("Enter sends when non-empty; Shift-Enter does not", async () => {
    const el = await makePromptLine();
    typeInto(el, "hello");
    setTimeout(() =>
      getTextarea(el).dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      ),
    );
    const event = await oneEvent(el, "cds-aichat-prompt-send-intent");
    expect(event).to.not.equal(null);

    let sentOnShift = false;
    el.addEventListener("cds-aichat-prompt-send-intent", () => {
      sentOnShift = true;
    });
    getTextarea(el).dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        shiftKey: true,
        bubbles: true,
      }),
    );
    expect(sentOnShift).to.equal(false);
  });

  it("does not send on Enter while an IME composition is active", async () => {
    const el = await makePromptLine();
    typeInto(el, "にほん");
    let sent = false;
    el.addEventListener("cds-aichat-prompt-send-intent", () => {
      sent = true;
    });
    // The Enter that commits an IME candidate carries isComposing=true.
    getTextarea(el).dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        isComposing: true,
        bubbles: true,
      }),
    );
    expect(sent).to.equal(false);
  });

  it("disabled toggles the textarea readOnly state", async () => {
    const el = await makePromptLine();
    expect(getTextarea(el).readOnly).to.equal(false);
    el.disabled = true;
    await el.updateComplete;
    expect(getTextarea(el).readOnly).to.equal(true);
  });
});

describe("<cds-aichat-prompt-line> (rich upgrade)", function () {
  it("upgrades to a Tiptap editor when rich is set", async () => {
    const el = await makePromptLine();
    expect(el.getEditor()).to.equal(null);
    el.rich = true;
    await waitForRich(el);
    const editor = el.getEditor();
    expect(editor).to.not.equal(null);
    const host = el.querySelector('[slot="editor"]') as HTMLElement;
    expect(host.querySelector(".ProseMirror")).to.not.equal(null);
    expect(host.querySelector("textarea")).to.equal(null);
  });

  it("caps the rich content height at the same value as the textarea", async () => {
    const el = await makePromptLine();
    el.rich = true;
    await waitForRich(el);
    const pm = el.querySelector('[slot="editor"] .ProseMirror') as HTMLElement;
    const style = getComputedStyle(pm);
    expect(style.maxHeight).to.equal(PROMPT_LINE_MAX_BLOCK_SIZE);
    expect(style.overflowY).to.equal("auto");
  });

  it("preserves the typed value across the upgrade", async () => {
    const el = await makePromptLine();
    typeInto(el, "carry over");
    el.rich = true;
    await waitForRich(el);
    expect(el.getEditor()!.getText()).to.equal("carry over");
  });

  it("maps the caret to the right doc position on a multi-line upgrade", async () => {
    const el = await makePromptLine();
    typeInto(el, "line1\nline2");
    // Caret after "li" on the second line (plain-text offset 8).
    getTextarea(el).setSelectionRange(8, 8);
    el.rich = true;
    await waitForRich(el);
    // textToDoc makes one paragraph per line, so offset 8 maps to doc pos 10:
    // +1 for the doc/first-paragraph start and +1 for the newline before it.
    const { from, to } = el.getEditor()!.state.selection;
    expect(from).to.equal(10);
    expect(to).to.equal(10);
  });

  it("defers the upgrade until IME composition ends", async () => {
    const el = await makePromptLine();
    const host = el.querySelector('[slot="editor"]') as HTMLElement;

    // Begin an IME composition, then request the rich upgrade.
    host.dispatchEvent(
      new CompositionEvent("compositionstart", { bubbles: true }),
    );
    el.rich = true;
    await el.updateComplete;

    // Even after the runtime chunk has had time to load, the upgrade stays
    // deferred — swapping the textarea out mid-composition would drop the
    // half-composed candidate.
    for (let i = 0; i < 10; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(el.getEditor()).to.equal(null);
    expect(getTextarea(el)).to.not.equal(null);

    // Ending composition runs the deferred upgrade.
    host.dispatchEvent(
      new CompositionEvent("compositionend", { bubbles: true }),
    );
    await waitForRich(el);
    expect(el.getEditor()).to.not.equal(null);
  });

  it("mounts rich directly when rich is set from the start", async () => {
    const el = await makePromptLine({ rich: true });
    await waitForRich(el);
    expect(el.getEditor()).to.not.equal(null);
  });

  it("is sticky — clearing rich keeps the editor", async () => {
    const el = await makePromptLine({ rich: true });
    await waitForRich(el);
    el.rich = false;
    await el.updateComplete;
    await Promise.resolve();
    expect(el.getEditor()).to.not.equal(null);
  });

  // Regression: clearContent() is the post-send wipe. It must be a host-origin
  // (programmatic) edit so the carbon-mention/command removal plugin stays
  // silent — otherwise sending strips the just-captured mention/command fields
  // from the host's structured_data sidecar before the message is built. See
  // issue #1619.
  it("does NOT fire a mention onRemove when clearContent() wipes the doc", async () => {
    const removed: SuggestionItem[] = [];
    const el = await makePromptLine();
    el.extensions = [
      carbonMention({
        trigger: "@",
        items: [{ id: "u1", label: "Alice" }],
        onRemove: (item) => removed.push(item),
      }),
    ];
    el.rich = true;
    await waitForRich(el);

    // Insert a mention chip programmatically (does not fire onSelect/onRemove).
    el.getEditor()!.commands.insertContent({
      type: "mention",
      attrs: { id: "u1", label: "Alice", value: "u1", data: null },
    });
    await Promise.resolve();

    el.clearContent();
    await Promise.resolve();

    expect(removed).to.have.lengthOf(0);
    expect(el.getEditor()!.getText()).to.equal("");
  });
});

describe("<cds-aichat-prompt-line> ensureEditor()", function () {
  it("loads Tiptap on demand and resolves the live editor", async () => {
    const el = await makePromptLine();
    expect(el.getEditor()).to.equal(null);
    const editor = await el.ensureEditor();
    expect(editor).to.not.equal(null);
    expect(editor).to.equal(el.getEditor());
    const host = el.querySelector('[slot="editor"]') as HTMLElement;
    expect(host.querySelector(".ProseMirror")).to.not.equal(null);
    expect(host.querySelector("textarea")).to.equal(null);
  });

  it("preserves already-typed text through the on-demand upgrade", async () => {
    const el = await makePromptLine();
    typeInto(el, "carry over");
    const editor = await el.ensureEditor();
    expect(editor.getText()).to.equal("carry over");
  });

  it("returns the same editor when already rich", async () => {
    const el = await makePromptLine({ rich: true });
    await waitForRich(el);
    const editor = await el.ensureEditor();
    expect(editor).to.equal(el.getEditor());
  });

  it("shares one instance across concurrent callers", async () => {
    const el = await makePromptLine();
    const [a, b] = await Promise.all([el.ensureEditor(), el.ensureEditor()]);
    expect(a).to.equal(b);
  });
});

describe("<cds-aichat-prompt-line> staged extensions", function () {
  it("does not force rich — setting extensions keeps the textarea", async () => {
    const el = await makePromptLine();
    el.extensions = [Extension.create({ name: "stagedNoop" })];
    await el.updateComplete;
    await Promise.resolve();
    expect(el.getEditor()).to.equal(null);
    expect(getTextarea(el)).to.not.equal(null);
  });

  it("installs the staged extensions when the editor mounts on demand", async () => {
    const el = await makePromptLine();
    el.extensions = [Extension.create({ name: "stagedMarker" })];
    await el.updateComplete;
    await Promise.resolve();
    // Still a textarea — staging alone never loads Tiptap.
    expect(el.getEditor()).to.equal(null);

    const editor = await el.ensureEditor();
    expect(editor).to.not.equal(null);
    const names = editor.extensionManager.extensions.map((ext) => ext.name);
    expect(names).to.include("stagedMarker");
  });
});
