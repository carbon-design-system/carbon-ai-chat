/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, PropertyValues, TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import throttle from "lodash-es/throttle.js";

import { LocalizationOptions } from "../../../../../../types/localization/LocalizationOptions";
import {
  TokenTree,
  renderTokenTree,
  markdownToTokenTree,
} from "./markdownProcessor";
import { consoleError, consoleLog } from "../../../../../utils/miscUtils";

class MarkdownElement extends LitElement {
  @property({ type: Boolean })
  debug = false;

  @property({ type: String })
  set markdown(newMarkdown: string) {
    if (newMarkdown !== this.fullText) {
      const old = this.fullText;
      this.fullText = newMarkdown ?? "";
      this.requestUpdate("markdown", old);
      if (this.debug) {
        consoleLog("markdown prop updated");
      }
      this.scheduleTokenParse();
    }
  }
  get markdown(): string {
    return this.fullText;
  }

  @property({ type: Boolean })
  sanitizeHTML = false;

  @property({ type: Boolean })
  shouldRemoveHTMLBeforeMarkdownConversion = false;

  @property({ type: Boolean })
  streaming = false;

  @property({ type: Object })
  localization?: LocalizationOptions;

  @property({ type: Boolean })
  dark = false;

  private fullText = "";

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);

    // Only schedule token parse if markdown content changed
    if (changedProperties.has("markdown")) {
      this.scheduleTokenParse();
    }

    // Re-render if dark mode, localization, or other rendering properties changed
    if (
      changedProperties.has("dark") ||
      changedProperties.has("localization") ||
      changedProperties.has("streaming")
    ) {
      this.scheduleRender();
    }
  }

  protected willUpdate(changed: PropertyValues<this>) {
    if (changed.has("sanitizeHTML") || changed.has("streaming")) {
      this.scheduleRender();
    }
  }

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
    if (this.debug) {
      consoleLog("Parsing markdown", this.fullText);
    }
    try {
      this.tokenTree = markdownToTokenTree(
        this.fullText,
        this.tokenTree,
        !this.shouldRemoveHTMLBeforeMarkdownConversion,
      );

      this.renderedContent = renderTokenTree(this.tokenTree, {
        sanitize: this.sanitizeHTML,
        streaming: this.streaming,
        localization: this.localization,
        dark: this.dark,
      });

      if (this.debug) {
        consoleLog("Markdown component renderedContent", this.renderedContent);
      }
    } catch (error) {
      consoleError("Failed to parse markdown", error);
    }
  }, 100);

  /**
   * Throttled function that re-renders the existing token tree with current settings.
   * Called when only rendering options change (like sanitizeHTML) without needing
   * to re-parse the markdown content.
   */
  private scheduleRender = throttle(async () => {
    this.renderedContent = renderTokenTree(this.tokenTree, {
      sanitize: this.sanitizeHTML,
      streaming: this.streaming,
      localization: this.localization,
      dark: this.dark,
    });
  }, 50);
}

export default MarkdownElement;
