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

import { markdownToTokenTree, TokenTree } from "./markdown-token-tree.js";
import { renderTokenTree } from "./markdown-renderer.js";
import { consoleError, consoleLog } from "./utils.js";

class MarkdownElement extends LitElement {
  @property({ type: Boolean, attribute: "debug" })
  debug = false;

  @property({ type: String, attribute: "markdown" })
  markdown = "";

  @property({ type: Boolean, attribute: "sanitize-html" })
  sanitizeHTML = false;

  @property({ type: Boolean, attribute: "remove-html" })
  removeHTML = false;

  @property({ type: Boolean, attribute: "streaming" })
  streaming = false;

  @property({ type: Boolean })
  highlight = true;

  // Table strings
  @property({ type: String, attribute: "filter-placeholder-text" })
  filterPlaceholderText = "Filter table...";

  @property({ type: String, attribute: "previous-page-text" })
  previousPageText = "Previous page";

  @property({ type: String, attribute: "next-page-text" })
  nextPageText = "Next page";

  @property({ type: String, attribute: "items-per-page-text" })
  itemsPerPageText = "Items per page:";

  @property({ type: String, attribute: "download-label-text" })
  downloadLabelText = "Download table data";

  @property({ type: String, attribute: "locale" })
  locale = "en";

  @property({ type: Object, attribute: false })
  getPaginationSupplementalText?: ({ count }: { count: number }) => string;

  @property({ type: Object, attribute: false })
  getPaginationStatusText?: ({
    start,
    end,
    count,
  }: {
    start: number;
    end: number;
    count: number;
  }) => string;

  // Code snippet strings
  @property({ type: String, attribute: "feedback" })
  feedback = "Copied!";

  @property({ type: String, attribute: "show-less-text" })
  showLessText = "Show less";

  @property({ type: String, attribute: "show-more-text" })
  showMoreText = "Show more";

  @property({ type: String, attribute: "tooltip-content" })
  tooltipContent = "Copy code";

  @property({ type: Object, attribute: false })
  getLineCountText?: ({ count }: { count: number }) => string;

  private needsReparse = false;
  // Tracks the latest asynchronous rendering work so callers waiting on
  // `updateComplete` know when throttled updates are done.
  private renderTask: Promise<void> | null = null;

  protected willUpdate(changed: PropertyValues<this>) {
    if (changed.has("markdown") || changed.has("removeHTML")) {
      // Properties that affect token tree structure require full reparse
      // - markdown: the source content changed
      // - removeHTML: changes which parser is used (html: true vs false)
      this.needsReparse = true;
      this.scheduleRender();
    } else if (
      // Properties that only affect rendering can skip reparsing
      // - sanitizeHTML: applies DOMPurify during render, doesn't change tokens
      // - string properties: change translated strings in rendered output
      // - streaming: affects loading states in rendered output
      changed.has("sanitizeHTML") ||
      changed.has("streaming") ||
      changed.has("filterPlaceholderText") ||
      changed.has("previousPageText") ||
      changed.has("nextPageText") ||
      changed.has("itemsPerPageText") ||
      changed.has("downloadLabelText") ||
      changed.has("locale") ||
      changed.has("getPaginationSupplementalText") ||
      changed.has("getPaginationStatusText") ||
      changed.has("feedback") ||
      changed.has("showLessText") ||
      changed.has("showMoreText") ||
      changed.has("tooltipContent") ||
      changed.has("getLineCountText")
    ) {
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
   * Throttled function that updates the rendered content.
   * If needsReparse is true, parses markdown into a token tree first.
   * Otherwise, just re-renders the existing token tree with current settings.
   */
  private renderMarkdown = async () => {
    try {
      if (this.needsReparse) {
        if (this.debug) {
          consoleLog("Parsing markdown", this.markdown);
        }
        // First, we take the markdown we were given and use the markdown-it parser to turn is into a tree we can
        // transform into Lit components and compare smartly to avoid re-renders of components that were already
        // rendered when the markdown is updated (likely by streaming, but possibly by an edit somewhere in the
        // middle). It takes the current tokenTree as an argument for quick diffing to avoid re-creating parts
        // of the tree.
        this.tokenTree = markdownToTokenTree(
          this.markdown,
          this.tokenTree,
          !this.removeHTML,
        );
        this.needsReparse = false;
      }

      // Next we take that tree and transform it into Lit content to be rendered into the template.
      // this.renderedContent is what is rendered in the template directly.
      this.renderedContent = renderTokenTree(this.tokenTree, {
        sanitize: this.sanitizeHTML,
        streaming: this.streaming,
        highlight: this.highlight,
        // Table strings
        filterPlaceholderText: this.filterPlaceholderText,
        previousPageText: this.previousPageText,
        nextPageText: this.nextPageText,
        itemsPerPageText: this.itemsPerPageText,
        downloadLabelText: this.downloadLabelText,
        locale: this.locale,
        getPaginationSupplementalText: this.getPaginationSupplementalText,
        getPaginationStatusText: this.getPaginationStatusText,
        // Code snippet strings
        feedback: this.feedback,
        showLessText: this.showLessText,
        showMoreText: this.showMoreText,
        tooltipContent: this.tooltipContent,
        getLineCountText: this.getLineCountText,
      });

      if (this.debug) {
        consoleLog("Markdown component renderedContent", this.renderedContent);
      }
    } catch (error) {
      consoleError("Failed to parse markdown", error);
    }
  };

  private scheduleRender = throttle(() => {
    // Lit's getter/setter pipeline can schedule multiple renders quickly.
    // We capture the active render promise so we can report completion later.
    const task = this.renderMarkdown();
    const trackedTask = task.finally(() => {
      if (this.renderTask === trackedTask) {
        this.renderTask = null;
      }
    });

    this.renderTask = trackedTask;
    return trackedTask;
  }, 150);

  protected async getUpdateComplete(): Promise<boolean> {
    // `updateComplete` is Lit's public hook for consumers/tests to await
    // all pending work. Because we throttle renders, the base implementation
    // might resolve before the throttled callback runs. Overriding this
    // method lets us flush the throttle and await the render promise so
    // callers can reliably wait for `renderedContent` to update.
    const result = await super.getUpdateComplete();

    const flushResult = (
      this.scheduleRender as {
        flush?: () => Promise<void> | void;
      }
    ).flush?.();

    if (flushResult instanceof Promise) {
      await flushResult;
    }

    if (this.renderTask) {
      await this.renderTask;
    }

    return result;
  }
}

export default MarkdownElement;
