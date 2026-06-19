/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import DOMPurify from "dompurify";
import { nothing, render, TemplateResult } from "lit";
import {
  Directive,
  ElementPart,
  Part,
  PartInfo,
  PartType,
  directive,
} from "lit/directive.js";

import { HTML_CONTAINER_SLOT } from "./html-helpers.js";

// Generic attribute spread for Lit templates
class SpreadAttrs extends Directive {
  render(_attrs: Record<string, unknown>) {
    return nothing;
  }
  update(part: any, [attrs]: [Record<string, unknown>]) {
    const el = part.element as Element;
    for (const [k, v] of Object.entries(attrs ?? {})) {
      if (v === false || v === null || v === undefined) {
        el.removeAttribute(k);
      } else if (v === true) {
        el.setAttribute(k, "");
      } else {
        el.setAttribute(k, String(v));
      }
    }
    return nothing;
  }
}

export const spread = directive(SpreadAttrs);

export const sanitizeHtmlContent = (content: string) =>
  DOMPurify.sanitize(content, {
    ADD_ATTR: ["data-aichat-markdown"],
    CUSTOM_ELEMENT_HANDLING: {
      tagNameCheck: () => true, // Allow custom elements
      attributeNameCheck: () => true,
      allowCustomizedBuiltInElements: true,
    },
  });

class HtmlContainer extends Directive {
  private slotElement: HTMLElement | null = null;
  private lastOpeningHtml = "";

  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (partInfo.type !== PartType.ELEMENT) {
      throw new Error("HtmlContainer must be used on an element");
    }
  }

  render(
    _openingHtml: string,
    _childTemplate: TemplateResult,
    _sanitize: boolean,
  ) {
    return nothing;
  }

  update(
    part: Part,
    [openingHtml, childTemplate, sanitize]: [string, TemplateResult, boolean],
  ) {
    const host = (part as ElementPart).element as HTMLElement;

    if (!this.slotElement || this.lastOpeningHtml !== openingHtml) {
      this.lastOpeningHtml = openingHtml;
      let content = `${openingHtml}${HTML_CONTAINER_SLOT}`;
      if (sanitize && content) {
        content = sanitizeHtmlContent(content);
      }

      const fragment = document.createRange().createContextualFragment(content);
      host.replaceChildren(...Array.from(fragment.childNodes));
      this.slotElement = host.querySelector("[data-aichat-markdown]");
    }

    if (this.slotElement) {
      render(childTemplate, this.slotElement);
    }

    return nothing;
  }
}

export const htmlContainer = directive(HtmlContainer);
