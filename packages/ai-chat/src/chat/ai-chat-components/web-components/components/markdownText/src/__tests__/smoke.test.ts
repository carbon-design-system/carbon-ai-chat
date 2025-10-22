/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { expect, fixture, html } from "@open-wc/testing";
import { TEXT } from "@carbon/ai-chat-utils";
import CDSChatMarkdownElement from "../../cds-aichat-markdown-text";
const MARKDOWN_ELEMENT_TAG = "cds-aichat-markdown-text";

const registeredConstructor = customElements.get(MARKDOWN_ELEMENT_TAG);

if (!registeredConstructor) {
  throw new Error("cds-aichat-markdown-text was not registered");
}

const MarkdownElementConstructor =
  (registeredConstructor as typeof CDSChatMarkdownElement) ??
  CDSChatMarkdownElement;

type MarkdownElementInstance = InstanceType<typeof MarkdownElementConstructor>;

describe("cds-aichat-markdown-text smoke test", () => {
  it("renders markdown when text content is provided", async () => {
    const el = await fixture<MarkdownElementInstance>(
      html`<cds-aichat-markdown-text></cds-aichat-markdown-text>`,
    );

    el.setAttribute("markdown", TEXT);

    await el.updateComplete;

    const root = el.shadowRoot;
    expect(root).to.not.equal(null);
    const textContent = (root?.textContent ?? "").replace(/\s+/g, " ");
    expect(textContent).to.include("Carbon");
    expect(textContent).to.include("chemical element");
  });

  it("strips inline html when HTML removal attribute is set", async () => {
    const el = await fixture<MarkdownElementInstance>(
      html`<cds-aichat-markdown-text
        markdown=${TEXT}
        remove-html
      ></cds-aichat-markdown-text>`,
    );

    await el.updateComplete;

    const root = el.shadowRoot;
    if (!root) {
      throw new Error("Expected shadow root to exist");
    }
    expect(root.innerHTML).to.not.include("<svg");
  });

  it("removes svg click handler when sanitize-html is enabled", async () => {
    const originalOpen = window.open;
    let openUrl: string | null = null;
    const mockOpen: typeof window.open = (
      input?: string | URL,
      _target?: string,
      _features?: string,
      _replace?: boolean,
    ) => {
      if (!input) {
        openUrl = null;
        return null;
      }
      openUrl = typeof input === "string" ? input : input.href;
      return null;
    };
    window.open = mockOpen;

    try {
      const unsafeEl = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown-text
          markdown=${TEXT}
        ></cds-aichat-markdown-text>`,
      );
      await unsafeEl.updateComplete;

      const unsafeSvg = unsafeEl.shadowRoot?.querySelector("svg");
      if (!unsafeSvg) {
        throw new Error("Expected SVG element to exist");
      }
      expect(unsafeSvg.getAttribute("onclick") ?? "").to.include("window.open");
      unsafeSvg.dispatchEvent(
        new MouseEvent("click", { bubbles: true, composed: true }),
      );

      expect(openUrl).to.equal("https://carbondesignsystem.com");

      openUrl = null;

      const safeEl = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown-text
          markdown=${TEXT}
          sanitize-html
        ></cds-aichat-markdown-text>`,
      );
      await safeEl.updateComplete;

      const safeSvg = safeEl.shadowRoot?.querySelector("svg");
      expect(safeSvg).to.not.equal(null);
      if (!safeSvg) {
        throw new Error("Expected sanitized SVG element to exist");
      }
      expect(safeSvg.getAttribute("onclick")).to.equal(null);
      safeSvg.dispatchEvent(
        new MouseEvent("click", { bubbles: true, composed: true }),
      );

      expect(openUrl).to.equal(null);
    } finally {
      window.open = originalOpen;
    }
  });

  it("preserves svg nesting with defs and title as children", async () => {
    const el = await fixture<MarkdownElementInstance>(
      html`<cds-aichat-markdown-text
        markdown=${TEXT}
      ></cds-aichat-markdown-text>`,
    );

    await el.updateComplete;

    const root = el.shadowRoot;
    if (!root) {
      throw new Error("Expected shadow root to exist");
    }

    const svg = root.querySelector("svg");
    expect(svg, "Expected inline SVG element").to.not.equal(null);

    const defs = svg?.querySelector("defs") ?? null;
    const title = svg?.querySelector("title") ?? null;

    expect(defs, "Expected <defs> child inside SVG").to.not.equal(null);
    expect(title, "Expected <title> child inside SVG").to.not.equal(null);

    if (defs) {
      expect(defs.parentElement, "defs should be nested under svg").to.equal(
        svg,
      );
    }
    if (title) {
      expect(title.parentElement, "title should be nested under svg").to.equal(
        svg,
      );
    }
  });

  it("correctly adds defined attributes to links", async () => {
    const el = await fixture<MarkdownElementInstance>(
      html`<cds-aichat-markdown-text
        markdown=${TEXT}
      ></cds-aichat-markdown-text>`,
    );

    await el.updateComplete;

    const root = el.shadowRoot;
    if (!root) {
      throw new Error("Expected shadow root to exist");
    }

    const link = root.querySelector('a[target="_self"]');
    expect(link).to.not.equal(null);
    if (!link) {
      throw new Error(`Link did not get target="_self" applied`);
    }
  });
});
