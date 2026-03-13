/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { expect, fixture, html } from "@open-wc/testing";
import CDSAIChatMarkdownElement from "../src/markdown.js";
const MARKDOWN_ELEMENT_TAG = "cds-aichat-markdown";

const TEXT = `Carbon <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 32 32" onclick="window.open('https://carbondesignsystem.com', '_blank')"><defs><style>.cls-1{fill:none;}</style></defs><title>If you click on this icon, it will go to https://carbondesignsystem.com. This is here to test "shouldSanitizeHTML". If true, the click shouldn't work!</title><path d="M13.5,30.8149a1.0011,1.0011,0,0,1-.4927-.13l-8.5-4.815A1,1,0,0,1,4,25V15a1,1,0,0,1,.5073-.87l8.5-4.815a1.0013,1.0013,0,0,1,.9854,0l8.5,4.815A1,1,0,0,1,23,15V25a1,1,0,0,1-.5073.87l-8.5,4.815A1.0011,1.0011,0,0,1,13.5,30.8149ZM6,24.417l7.5,4.2485L21,24.417V15.583l-7.5-4.2485L6,15.583Z"/><path d="M28,17H26V7.583L18.5,3.3345,10.4927,7.87,9.5073,6.13l8.5-4.815a1.0013,1.0013,0,0,1,.9854,0l8.5,4.815A1,1,0,0,1,28,7Z"/><rect class="cls-1" width="32" height="32" transform="translate(32 32) rotate(180)"/></svg> is a **chemical element** with the *atomic number* 6 and symbol **C**. \`C + O₂ → CO₂\` represents one of carbon's most fundamental reactions.

Carbon forms [covalent bonds](https://ibm.com) through electron sharing and creates [carbon chains](https://ibm.com){{target="_self"}} that are essential for organic molecules.
`;

const registeredConstructor = customElements.get(MARKDOWN_ELEMENT_TAG);

if (!registeredConstructor) {
  throw new Error("cds-aichat-markdown was not registered");
}

const MarkdownElementConstructor =
  (registeredConstructor as typeof CDSAIChatMarkdownElement) ??
  CDSAIChatMarkdownElement;

type MarkdownElementInstance = InstanceType<typeof MarkdownElementConstructor>;

describe("cds-aichat-markdown smoke test", () => {
  it("renders markdown when markdown property is provided", async () => {
    const el = await fixture<MarkdownElementInstance>(
      html`<cds-aichat-markdown .markdown=${TEXT}></cds-aichat-markdown>`,
    );

    await el.updateComplete;

    const root = el.shadowRoot;
    expect(root).to.not.equal(null);
    const textContent = (root?.textContent ?? "").replace(/\s+/g, " ");
    expect(textContent).to.include("Carbon");
    expect(textContent).to.include("chemical element");
  });

  it("strips inline html when HTML removal attribute is set", async () => {
    const el = await fixture<MarkdownElementInstance>(
      html`<cds-aichat-markdown
        remove-html
        .markdown=${TEXT}
      ></cds-aichat-markdown>`,
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
        html`<cds-aichat-markdown .markdown=${TEXT}></cds-aichat-markdown>`,
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
        html`<cds-aichat-markdown
          sanitize-html
          .markdown=${TEXT}
        ></cds-aichat-markdown>`,
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
      html`<cds-aichat-markdown .markdown=${TEXT}></cds-aichat-markdown>`,
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
      html`<cds-aichat-markdown .markdown=${TEXT}></cds-aichat-markdown>`,
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

  describe("linkify functionality", () => {
    it("automatically converts plain URLs to clickable links", async () => {
      const textWithUrl = "Check out https://www.ibm.com for more info";
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .markdown=${textWithUrl}
        ></cds-aichat-markdown>`,
      );

      await el.updateComplete;

      const root = el.shadowRoot;
      if (!root) {
        throw new Error("Expected shadow root to exist");
      }

      const link = root.querySelector('a[href="https://www.ibm.com"]');
      expect(link).to.not.equal(null);
      expect(link?.textContent).to.equal("https://www.ibm.com");
      expect(link?.getAttribute("target")).to.equal("_blank");
    });

    it("converts multiple URLs in the same text", async () => {
      const textWithMultipleUrls =
        "Visit https://ibm.com and https://github.com for resources";
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .markdown=${textWithMultipleUrls}
        ></cds-aichat-markdown>`,
      );

      await el.updateComplete;

      const root = el.shadowRoot;
      if (!root) {
        throw new Error("Expected shadow root to exist");
      }

      const links = root.querySelectorAll("a");
      expect(links.length).to.be.at.least(2);

      const ibmLink = root.querySelector('a[href="https://ibm.com"]');
      const githubLink = root.querySelector('a[href="https://github.com"]');

      expect(ibmLink).to.not.equal(null);
      expect(githubLink).to.not.equal(null);
    });

    it("linkifies URLs with different protocols", async () => {
      const textWithProtocols = `
HTTP: http://example.com
      HTTPS: https://secure.example.com
      FTP: ftp://files.example.com
      `;
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .markdown=${textWithProtocols}
        ></cds-aichat-markdown>`,
      );

      await el.updateComplete;

      const root = el.shadowRoot;
      if (!root) {
        throw new Error("Expected shadow root to exist");
      }

      expect(root.querySelector('a[href="http://example.com"]')).to.not.equal(
        null,
      );
      expect(
        root.querySelector('a[href="https://secure.example.com"]'),
      ).to.not.equal(null);
      expect(
        root.querySelector('a[href="ftp://files.example.com"]'),
      ).to.not.equal(null);
    });

    it("linkifies email addresses", async () => {
      const textWithEmail = "Contact us at support@example.com for help";
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .markdown=${textWithEmail}
        ></cds-aichat-markdown>`,
      );

      await el.updateComplete;

      const root = el.shadowRoot;
      if (!root) {
        throw new Error("Expected shadow root to exist");
      }

      const emailLink = root.querySelector(
        'a[href="mailto:support@example.com"]',
      );
      expect(emailLink).to.not.equal(null);
      expect(emailLink?.textContent).to.equal("support@example.com");
    });

    it("linkifies URLs within markdown text alongside other formatting", async () => {
      const mixedText =
        "This is **bold** text with https://example.com and *italic* text";
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .markdown=${mixedText}
        ></cds-aichat-markdown>`,
      );

      await el.updateComplete;

      const root = el.shadowRoot;
      if (!root) {
        throw new Error("Expected shadow root to exist");
      }

      const link = root.querySelector('a[href="https://example.com"]');
      const bold = root.querySelector("strong");
      const italic = root.querySelector("em");

      expect(link).to.not.equal(null);
      expect(bold).to.not.equal(null);
      expect(italic).to.not.equal(null);
    });

    it("does not linkify URLs inside code blocks", async () => {
      const codeWithUrl = "`https://example.com`";
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .markdown=${codeWithUrl}
        ></cds-aichat-markdown>`,
      );

      await el.updateComplete;

      const root = el.shadowRoot;
      if (!root) {
        throw new Error("Expected shadow root to exist");
      }

      const code = root.querySelector("code");
      expect(code).to.not.equal(null);
      expect(code?.textContent).to.equal("https://example.com");

      // Should not have a link inside the code element
      const link = code?.querySelector("a");
      expect(link).to.equal(null);
    });

    it("linkifies URLs with removeHTML enabled", async () => {
      const textWithUrl = "Visit https://example.com for details";
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          remove-html
          .markdown=${textWithUrl}
        ></cds-aichat-markdown>`,
      );

      await el.updateComplete;

      const root = el.shadowRoot;
      if (!root) {
        throw new Error("Expected shadow root to exist");
      }

      const link = root.querySelector('a[href="https://example.com"]');
      expect(link).to.not.equal(null);
      expect(link?.textContent).to.equal("https://example.com");
    });

    it("sanitizes linkified URLs when sanitize-html is enabled", async () => {
      const textWithUrl = "Check https://example.com";
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          sanitize-html
          .markdown=${textWithUrl}
        ></cds-aichat-markdown>`,
      );

      await el.updateComplete;

      const root = el.shadowRoot;
      if (!root) {
        throw new Error("Expected shadow root to exist");
      }

      const link = root.querySelector('a[href="https://example.com"]');
      expect(link).to.not.equal(null);
      // Should still have target="_blank" from renderer
      expect(link?.getAttribute("target")).to.equal("_blank");
    });
  });
});
