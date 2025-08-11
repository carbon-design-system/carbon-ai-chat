/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import throttle from "lodash-es/throttle.js";

import { TokenTree } from "../markdown/utils/tokenTree";
import { getMarkdownWorker } from "../markdown/workers/workerManager";
import { renderTokenTree } from "../markdown/utils/renderTokenTree";

class MarkdownTextElement extends LitElement {
  @property({ type: String })
  set markdown(newMarkdown: string) {
    if (newMarkdown !== this.fullText) {
      this.fullText = newMarkdown;
      this.scheduleTokenParse();
    }
  }

  @property({ type: Boolean })
  set sanitizeHTML(value: boolean) {
    const oldValue = this._sanitizeHTML;
    this._sanitizeHTML = value;
    if (oldValue !== value && this.tokenTree.children.length > 0) {
      this.scheduleRender();
    }
  }
  get sanitizeHTML() {
    return this._sanitizeHTML;
  }
  private _sanitizeHTML = false;

  @property({ type: Boolean }) shouldRemoveHTMLBeforeMarkdownConversion = false;

  @property({
    type: Boolean,
    attribute: "should-remove-padding",
    reflect: true,
  })
  shouldRemovePadding: boolean;

  private fullText = "";

  @state()
  tokenTree: TokenTree = {
    key: "root",
    token: {
      type: "root",
      tag: "",
      nesting: 0,
      level: 0,
      content: "",
      attrs: null,
      children: null,
      markup: "",
      block: true,
      hidden: false,
      map: null,
      info: "",
      meta: null,
    },
    children: [],
  };

  @state()
  renderedContent: TemplateResult | null = null;

  /**
   * Throttled function that parses markdown text into a token tree and renders it.
   * Called when the markdown content changes. Handles both parsing and rendering
   * to avoid duplicate work when content updates.
   */
  private scheduleTokenParse = throttle(async () => {
    this.tokenTree = (await getMarkdownWorker(
      this.fullText,
      this.tokenTree,
      !this.shouldRemoveHTMLBeforeMarkdownConversion
    )) as TokenTree;
    this.renderedContent = await renderTokenTree(
      this.tokenTree,
      this.sanitizeHTML
    );
  }, 100);

  /**
   * Throttled function that re-renders the existing token tree with current settings.
   * Called when only rendering options change (like sanitizeHTML) without needing
   * to re-parse the markdown content.
   */
  private scheduleRender = throttle(async () => {
    this.renderedContent = await renderTokenTree(
      this.tokenTree,
      this.sanitizeHTML
    );
  }, 50);
}

export default MarkdownTextElement;
