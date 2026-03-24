/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import { carbonElement } from "../../../globals/decorators/carbon-element.js";
import prefix from "../../../globals/settings.js";
import commonStyles from "../../../globals/scss/common.scss?lit";
import styles from "./markdown.scss?lit";
import throttle from "lodash-es/throttle.js";

import { markdownToTokenTree, TokenTree } from "./markdown-token-tree.js";
import { renderTokenTree } from "./markdown-renderer.js";
import { consoleError } from "./utils.js";

function hasTrailingTableToken(node: TokenTree): boolean {
  if (node.token.tag === "table") {
    return true;
  }

  const children = node.children || [];
  if (children.length === 0) {
    return false;
  }

  // Follow only the rightmost branch. A trailing table is one that sits at the
  // end of the current markdown output, not just the end of an arbitrary subtree.
  return hasTrailingTableToken(children[children.length - 1]);
}

function hasNodeAfterTable(node: TokenTree): boolean {
  const children = node.children || [];
  for (let index = 0; index < children.length; index++) {
    const child = children[index];
    if (child.token.tag === "table" && index < children.length - 1) {
      return true;
    }
    if (hasNodeAfterTable(child)) {
      return true;
    }
  }
  return false;
}

function hasLikelyPartialTableTail(markdown: string): boolean {
  const normalized = markdown.replace(/\r/g, "");
  const lines = normalized.split("\n");
  let index = lines.length - 1;

  while (index >= 0 && lines[index].trim() === "") {
    index--;
  }

  if (index < 0) {
    return false;
  }

  const lastLine = lines[index].trim();

  // During streaming, partially emitted table rows frequently end with a pipe
  // and markdown-it can temporarily stop recognizing the table token.
  if (lastLine.startsWith("|") || lastLine.endsWith("|")) {
    return true;
  }

  // Keep loading mode if the tail still looks like a table separator row.
  return /^\|?[\s:-]+(\|[\s:-]+)+\|?$/.test(lastLine);
}

/**
 * Markdown component
 * @element cds-aichat-markdown
 */
@carbonElement(`${prefix}-markdown`)
class CDSAIChatMarkdown extends LitElement {
  static styles = [commonStyles, styles];

  /**
   * Sanitize any HTML included in the markdown. e.g. remove script tags, onclick handlers, etc.
   */
  @property({ type: Boolean, attribute: "sanitize-html" })
  sanitizeHTML = false;

  /**
   * Remove all HTML from included markdown.
   */
  @property({ type: Boolean, attribute: "remove-html" })
  removeHTML = false;

  /**
   * Direct markdown source input.
   */
  @property({ type: String })
  markdown = "";

  /**
   * If you are actively streaming, setting this to true can help prevent needless UI thrashing when writing
   * complex components (like a sortable and filterable table).
   */
  @property({ type: Boolean, attribute: "streaming" })
  streaming = false;

  // Code snippet properties
  /** Enable syntax highlighting for any code fence blocks. */
  @property({ type: Boolean, attribute: "code-snippet-highlight" })
  codeSnippetHighlight = false;

  /** Label for collapsing long code blocks. */
  @property({ type: String, attribute: "code-snippet-show-less-text" })
  codeSnippetShowLessText = "Show less";

  /** Label for expanding long code blocks. */
  @property({ type: String, attribute: "code-snippet-show-more-text" })
  codeSnippetShowMoreText = "Show more";

  /** Tooltip content for the copy action on code blocks. */
  @property({
    type: String,
    attribute: "code-snippet-copy-button-tooltip-content",
  })
  codeSnippetCopyButtonTooltipContent = "Copy code";

  /** Formatter for the code block line count. */
  @property({ type: Object, attribute: false })
  codeSnippetGetLineCountText?: ({ count }: { count: number }) => string;

  /** Aria-label for code snippets when in read-only mode. */
  @property({ type: String, attribute: "code-snippet-aria-label-readonly" })
  codeSnippetAriaLabelReadOnly = "Code snippet";

  /** Aria-label for code snippets when in editable mode. */
  @property({ type: String, attribute: "code-snippet-aria-label-editable" })
  codeSnippetAriaLabelEditable = "Code editor";

  // Table properties
  /** Placeholder text for table filters. */
  @property({ type: String, attribute: "table-filter-placeholder-text" })
  tableFilterPlaceholderText = "Filter table...";

  /** Label for the previous page control in tables. */
  @property({ type: String, attribute: "table-previous-page-text" })
  tablePreviousPageText = "Previous page";

  /** Label for the next page control in tables. */
  @property({ type: String, attribute: "table-next-page-text" })
  tableNextPageText = "Next page";

  /** Label for the items-per-page control in tables. */
  @property({ type: String, attribute: "table-items-per-page-text" })
  tableItemsPerPageText = "Items per page:";

  /** Label for download of CSV of table data. */
  @property({ type: String, attribute: "table-download-label-text" })
  tableDownloadLabelText = "Download table data";

  /** Locale used for table pagination and formatting. */
  @property({ type: String, attribute: "table-locale" })
  tableLocale = "en";

  /** Optional formatter for supplemental pagination text. */
  @property({ type: Object, attribute: false })
  tableGetPaginationSupplementalText?: ({ count }: { count: number }) => string;

  /** Optional formatter for pagination status text. */
  @property({ type: Object, attribute: false })
  tableGetPaginationStatusText?: ({
    start,
    end,
    count,
  }: {
    start: number;
    end: number;
    count: number;
  }) => string;

  /**
   * @internal
   */
  private needsReparse = false;

  /**
   * Tracks the latest asynchronous rendering work so callers waiting on `updateComplete` know when throttled updates are done.
   *
   * @internal
   */
  private renderTask: Promise<void> | null = null;

  private hasRenderedStreamingTableLoadingFrame = false;
  private stagedStreamingTokenTree: TokenTree | null = null;
  private isStreamingTableLoadingMode = false;
  private hasAdoptedLightDomMarkdown = false;

  connectedCallback() {
    super.connectedCallback();
    this.adoptLightDomMarkdown();
    this.needsReparse = true;
    this.scheduleRender();
  }

  private adoptLightDomMarkdown() {
    if (this.hasAdoptedLightDomMarkdown || this.markdown) {
      return;
    }

    // Backward compatibility: treat static light-DOM text as initial markdown
    // when the explicit `markdown` property was not provided.
    const lightDomMarkdown = this.textContent?.trim() ?? "";
    if (lightDomMarkdown) {
      this.markdown = lightDomMarkdown;
    }

    this.hasAdoptedLightDomMarkdown = true;
  }

  protected willUpdate(changed: PropertyValues<this>) {
    if (changed.has("removeHTML") || changed.has("markdown")) {
      // Properties that affect token tree structure require full reparse
      // - removeHTML: changes which parser is used (html: true vs false)
      // - markdown: updates the source text to parse
      this.needsReparse = true;
      this.scheduleRender();
    } else if (
      // Properties that only affect rendering can skip reparsing
      // - sanitizeHTML: applies DOMPurify during render, doesn't change tokens
      // - string properties: change translated strings in rendered output
      // - streaming: affects loading states in rendered output
      changed.has("sanitizeHTML") ||
      changed.has("streaming") ||
      // Code snippet properties
      changed.has("codeSnippetHighlight") ||
      changed.has("codeSnippetShowLessText") ||
      changed.has("codeSnippetShowMoreText") ||
      changed.has("codeSnippetCopyButtonTooltipContent") ||
      changed.has("codeSnippetGetLineCountText") ||
      changed.has("codeSnippetAriaLabelReadOnly") ||
      changed.has("codeSnippetAriaLabelEditable") ||
      // Table properties
      changed.has("tableFilterPlaceholderText") ||
      changed.has("tablePreviousPageText") ||
      changed.has("tableNextPageText") ||
      changed.has("tableItemsPerPageText") ||
      changed.has("tableDownloadLabelText") ||
      changed.has("tableLocale") ||
      changed.has("tableGetPaginationSupplementalText") ||
      changed.has("tableGetPaginationStatusText")
    ) {
      this.scheduleRender();
    }
  }

  /**
   * @internal
   */
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

  /**
   * @internal
   */
  @state()
  renderedContent: TemplateResult | null = null;

  /**
   * Throttled function that updates the rendered content.
   * If needsReparse is true, parses markdown into a token tree first.
   * Otherwise, just re-renders the existing token tree with current settings.
   *
   * @internal
   */
  private renderMarkdown = async () => {
    try {
      const markdownContent = this.markdown ?? "";
      const previousTreeForDiff =
        this.stagedStreamingTokenTree ?? this.tokenTree;
      let nextTokenTree = previousTreeForDiff;

      if (this.needsReparse) {
        // First, we take the markdown we were given and use the markdown-it parser to turn is into a tree we can
        // transform into Lit components and compare smartly to avoid re-renders of components that were already
        // rendered when the markdown is updated (likely by streaming, but possibly by an edit somewhere in the
        // middle). It takes the current tokenTree as an argument for quick diffing to avoid re-creating parts
        // of the tree.
        nextTokenTree = markdownToTokenTree(
          markdownContent,
          previousTreeForDiff,
          !this.removeHTML,
        );
        this.needsReparse = false;
      }

      const hasStreamingTailTable =
        Boolean(this.streaming) && hasTrailingTableToken(nextTokenTree);
      const hasParsedNodeAfterTable = hasNodeAfterTable(nextTokenTree);

      if (!this.streaming) {
        this.isStreamingTableLoadingMode = false;
      } else if (this.isStreamingTableLoadingMode) {
        if (
          hasParsedNodeAfterTable &&
          !hasLikelyPartialTableTail(markdownContent)
        ) {
          this.isStreamingTableLoadingMode = false;
        }
      } else if (hasStreamingTailTable) {
        this.isStreamingTableLoadingMode = true;
      }

      if (this.streaming && this.isStreamingTableLoadingMode) {
        if (!this.hasRenderedStreamingTableLoadingFrame) {
          if (nextTokenTree !== this.tokenTree) {
            this.tokenTree = nextTokenTree;
          }
          this.renderedContent = renderTokenTree(nextTokenTree, {
            sanitize: this.sanitizeHTML,
            streaming: this.streaming,
            // Code snippet properties
            codeSnippetHighlight: this.codeSnippetHighlight,
            codeSnippetShowLessText: this.codeSnippetShowLessText,
            codeSnippetShowMoreText: this.codeSnippetShowMoreText,
            codeSnippetCopyButtonTooltipContent:
              this.codeSnippetCopyButtonTooltipContent,
            codeSnippetGetLineCountText: this.codeSnippetGetLineCountText,
            codeSnippetAriaLabelReadOnly: this.codeSnippetAriaLabelReadOnly,
            codeSnippetAriaLabelEditable: this.codeSnippetAriaLabelEditable,
            // Table properties
            tableFilterPlaceholderText: this.tableFilterPlaceholderText,
            tablePreviousPageText: this.tablePreviousPageText,
            tableNextPageText: this.tableNextPageText,
            tableItemsPerPageText: this.tableItemsPerPageText,
            tableDownloadLabelText: this.tableDownloadLabelText,
            tableLocale: this.tableLocale,
            tableGetPaginationSupplementalText:
              this.tableGetPaginationSupplementalText,
            tableGetPaginationStatusText: this.tableGetPaginationStatusText,
          });
          this.hasRenderedStreamingTableLoadingFrame = true;
          this.stagedStreamingTokenTree = null;
        } else {
          this.stagedStreamingTokenTree = nextTokenTree;
        }
        return;
      }

      const renderTree = this.stagedStreamingTokenTree ?? nextTokenTree;
      this.stagedStreamingTokenTree = null;
      this.hasRenderedStreamingTableLoadingFrame = false;
      if (renderTree !== this.tokenTree) {
        this.tokenTree = renderTree;
      }

      // Next we take that tree and transform it into Lit content to be rendered into the template.
      // this.renderedContent is what is rendered in the template directly.
      this.renderedContent = renderTokenTree(renderTree, {
        sanitize: this.sanitizeHTML,
        streaming: this.streaming,
        // Code snippet properties
        codeSnippetHighlight: this.codeSnippetHighlight,
        codeSnippetShowLessText: this.codeSnippetShowLessText,
        codeSnippetShowMoreText: this.codeSnippetShowMoreText,
        codeSnippetCopyButtonTooltipContent:
          this.codeSnippetCopyButtonTooltipContent,
        codeSnippetGetLineCountText: this.codeSnippetGetLineCountText,
        codeSnippetAriaLabelReadOnly: this.codeSnippetAriaLabelReadOnly,
        codeSnippetAriaLabelEditable: this.codeSnippetAriaLabelEditable,
        // Table properties
        tableFilterPlaceholderText: this.tableFilterPlaceholderText,
        tablePreviousPageText: this.tablePreviousPageText,
        tableNextPageText: this.tableNextPageText,
        tableItemsPerPageText: this.tableItemsPerPageText,
        tableDownloadLabelText: this.tableDownloadLabelText,
        tableLocale: this.tableLocale,
        tableGetPaginationSupplementalText:
          this.tableGetPaginationSupplementalText,
        tableGetPaginationStatusText: this.tableGetPaginationStatusText,
      });
    } catch (error) {
      consoleError("Failed to parse markdown", error);
    }
  };

  /**
   * @internal
   */
  private scheduleRender = throttle(
    () => {
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
    },
    100,
    { leading: true, trailing: true },
  );

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

  protected render() {
    const { renderedContent } = this;
    return html`<div class="cds-aichat-markdown-stack">
      ${renderedContent}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-markdown": CDSAIChatMarkdown;
  }
}

export { CDSAIChatMarkdown };
export default CDSAIChatMarkdown;
