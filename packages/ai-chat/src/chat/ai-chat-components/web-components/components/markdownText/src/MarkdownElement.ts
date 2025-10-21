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
import { markdownToTokenTree, TokenTree } from "./markdownTokenTree";
import { renderTokenTree } from "./markdownRenderer";
import { consoleError, consoleLog } from "../../../../../utils/miscUtils";

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

  @property({ type: Object, attribute: false })
  localization?: LocalizationOptions;

  @property({ type: Boolean, attribute: "dark" })
  dark = false;

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
      // - dark: changes theme classes in rendered output
      // - localization: changes translated strings in rendered output
      // - streaming: affects loading states in rendered output
      changed.has("sanitizeHTML") ||
      changed.has("dark") ||
      changed.has("localization") ||
      changed.has("streaming")
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
        localization: this.localization,
        dark: this.dark,
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
