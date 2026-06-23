/*
 *  Copyright IBM Corp. 2025, 2026
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

import MarkdownIt from "markdown-it";

import {
  markdownToTokenTree,
  type MarkdownItPlugin,
  type TokenTree,
} from "./markdown-token-tree.js";
import {
  renderMarkdownTree,
  type MarkdownCustomRenderers,
  type MarkdownRendererSlotDescriptor,
} from "./markdown-renderer.js";
import {
  hasLikelyPartialTableTail,
  hasNodeAfterTable,
  hasTrailingTableToken,
} from "./utils/streaming-table.js";

const CONSOLE_PREFIX = "[carbon-ai-chat-components]";

/**
 * True if `node` is inside (or is) a light-DOM element with a `slot` attribute
 * set, up to (but not including) `boundary`. Portal hosts mounted by consumers
 * carry a `slot` attribute, so this is used to skip both `textContent`
 * contributions and observed mutations that originated inside a portal subtree.
 */
function isInsidePortalHost(node: Node, boundary: Node): boolean {
  let cur: Node | null = node;
  while (cur && cur !== boundary) {
    if (cur instanceof Element && cur.hasAttribute("slot")) {
      return true;
    }
    cur = cur.parentNode;
  }
  return false;
}

/**
 * Concatenates the markdown source from `element`'s light-DOM children,
 * skipping any `<element slot="…">` portal hosts so consumer-rendered overrides
 * don't contaminate the parsed markdown source.
 */
function readLightDomMarkdownSource(element: Element): string {
  let out = "";
  for (const child of Array.from(element.childNodes)) {
    if (child instanceof Element && child.hasAttribute("slot")) {
      continue;
    }
    if (child.nodeType === Node.TEXT_NODE) {
      out += child.nodeValue ?? "";
    } else if (child instanceof Element) {
      out += child.textContent ?? "";
    }
  }
  return out.trim();
}

/**
 * Renders markdown as Carbon-styled DOM. Streaming-friendly: incremental updates reparse the markdown source into a `TokenTree`, diff it against the prior tree to reuse stable subtrees, then walk it into a Lit `TemplateResult` — Lit's `repeat` directive keys off the diffed nodes so unchanged DOM stays put.
 *
 * ### Lifecycle
 *
 * 1. A property setter (or a light-DOM mutation) lands. `willUpdate` decides whether the change requires a reparse (`markdown`, `removeHTML`, `markdownItPlugins`) or only a re-render (translated strings, `streaming`, `sanitizeHTML`, `customRenderers`).
 * 2. `scheduleRender` throttles bursts to 100ms (leading + trailing).
 * 3. `renderMarkdown` parses (if needed) via {@link markdownToTokenTree}, then calls {@link renderMarkdownTree} to produce both a `TemplateResult` and a batch of {@link MarkdownRendererSlotDescriptor} records.
 * 4. After Lit commits, `updated()` runs `reconcileCustomRendererHosts` — that is where consumer-supplied `customRenderers` callbacks fire and plugin-fallback HTML is adopted into light-DOM slot hosts.
 *
 * ### Extensibility
 *
 * - {@link markdownItPlugins} runs after the built-in markdown-it plugins (markdown-it-attrs, highlight, task-lists). A new array identity rebuilds the markdown-it instance and forces a full reparse. Tokens introduced by a plugin that the native dispatch can't handle — either an unknown tag, or a plugin-overridden rule on a curated allow-list of leaf tokens — route through `md.renderer.render()` via `./utils/plugin-fallback.ts` and surface as `pluginFallback` descriptors. Their rendered HTML is adopted into a light-DOM slot host so consumer-supplied CSS (e.g. a KaTeX stylesheet on the host page) reaches it.
 * - {@link customRenderers} overrides per-element rendering for `table` and `codeBlock`. The renderer emits a named `<slot>` placeholder; the reconciler invokes the consumer's callback with the parsed data and appends the returned `HTMLElement` as a `<div slot="…">` light-DOM child. Returning the same element reference across renders avoids DOM churn.
 *
 * ### Light-DOM source adoption
 *
 * When the `markdown` property has never been set explicitly, the element treats its light-DOM text content as the initial source and watches for further mutations via a `MutationObserver`. Setting the property explicitly stops the observer — the property is then the authoritative source.
 *
 * ### Related files
 *
 * - `./markdown-token-tree.ts` — markdown-it parse + tree builder + streaming-aware diff (with `cachedHtml` carry-forward for plugin-delegated tokens).
 * - `./markdown-renderer.ts` — `TokenTree` → Lit `TemplateResult`, plus descriptor collection.
 * - `./markdown-renderer-types.ts` — public ({@link MarkdownCustomRenderers}) and internal ({@link MarkdownRendererSlotDescriptor}, `RenderTokenTreeOptions`) contracts.
 * - `./utils/plugin-fallback.ts` — delegation to `md.renderer.render()` for plugin-introduced tokens.
 * - `./utils/streaming-table.ts` — heuristics that hold a streaming table in a skeleton "loading" state until its tail stabilizes.
 *
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
   * Internal storage for markdown content.
   * @internal
   */
  private _markdown = "";

  /**
   * Flag to temporarily allow internal markdown updates without marking as explicitly set.
   * @internal
   */
  private isInternalMarkdownUpdate = false;

  /**
   * Direct markdown source input.
   */
  @property({ type: String })
  get markdown(): string {
    return this._markdown;
  }
  set markdown(value: string) {
    const oldValue = this._markdown;
    this._markdown = value;

    // Track that markdown was explicitly set (not from Light DOM adoption)
    // Only mark as explicitly set if this is NOT an internal update
    if (!this.isInternalMarkdownUpdate) {
      this.markdownPropertyExplicitlySet = true;
      this.stopObservingLightDom();
    }

    this.requestUpdate("markdown", oldValue);
  }

  /**
   * If you are actively streaming, setting this to true can help prevent needless UI thrashing when writing
   * complex components (like a sortable and filterable table).
   */
  @property({ type: Boolean, attribute: "streaming" })
  streaming = false;

  // Code snippet properties
  /** Enable syntax highlighting for any code fence blocks. */
  @property({ type: Boolean, attribute: "code-snippet-highlight" })
  codeSnippetHighlight = true;

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
   * Markdown-it plugins applied after the built-in plugins
   * (markdown-it-attrs, markdown-it-highlight, markdown-it-task-lists).
   * Changes force a reparse. Memoize this array — a new reference each render
   * rebuilds the markdown-it instance.
   */
  @property({ type: Array, attribute: false })
  markdownItPlugins?: MarkdownItPlugin[];

  /**
   * Per-element render overrides. For each `kind` whose callback is provided,
   * the markdown element emits a named `<slot>` placeholder in its shadow
   * DOM, then — after each render — invokes the callback with the parsed
   * data and adopts the returned `HTMLElement` as a `<div slot="…">`
   * light-DOM child of this element. Return `null` to fall back to the
   * default Carbon rendering. Returning the same element reference across
   * renders avoids DOM churn.
   *
   * The consumer's returned element lives in this element's light DOM, not
   * in its shadow root, so external CSS applies normally.
   */
  @property({ attribute: false })
  customRenderers?: MarkdownCustomRenderers;

  /**
   * Descriptors collected during the most recent render task; consumed by
   * the `updated()` reconcile to invoke {@link customRenderers} callbacks.
   * @internal
   */
  private latestRendererDescriptors: MarkdownRendererSlotDescriptor[] = [];

  /**
   * Light-DOM slot hosts adopted on behalf of {@link customRenderers}, keyed
   * by slot name. Reused across renders for stable identity.
   * @internal
   */
  private slotHosts: Map<string, HTMLElement> = new Map();

  /**
   * Slot names whose host was created by an outer listener (a chat container
   * that called `preventDefault()` on the host-mount event). We track these
   * so we can fire matching unmount events without trying to remove a host we
   * never appended.
   * @internal
   */
  private delegatedPluginSlots: Set<string> = new Set();

  /**
   * The markdown-it instance produced by the most recent parse. Forwarded into
   * the renderer so unknown tokens can fall back to `md.renderer.render()`.
   * @internal
   */
  private markdownItInstance?: MarkdownIt;

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
  private hasConnected = false;

  /**
   * Tracks whether the markdown property has been explicitly set by the user.
   * When false, the component will monitor Light DOM changes.
   * @internal
   */
  private markdownPropertyExplicitlySet = false;

  /**
   * MutationObserver to monitor Light DOM changes when markdown property isn't explicitly set.
   * @internal
   */
  private lightDomObserver: MutationObserver | null = null;

  /**
   * Generation counter for Light DOM mutation processing. Incremented when a
   * mutation is observed and decremented when the resulting microtask
   * completes. `updateComplete` waits while the counter is non-zero.
   * @internal
   */
  private pendingLightDomMutations = 0;

  connectedCallback() {
    super.connectedCallback();
    this.hasConnected = true;
    this.adoptLightDomMarkdown();

    // Task-list checkbox toggles bubble (composed) out of the rendered
    // `cds-checkbox` elements; one delegated listener forwards them to a
    // consumer `checklist.onToggle`.
    this.addEventListener(
      "cds-checkbox-changed",
      this.handleChecklistToggle as EventListener,
    );

    // Ensure we parse and render on initial mount, even if markdown was set before connection
    this.needsReparse = true;
    this.scheduleRender();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener(
      "cds-checkbox-changed",
      this.handleChecklistToggle as EventListener,
    );
    this.stopObservingLightDom();
    // Tear down any adopted slot hosts so they don't leak across re-connect.
    for (const host of this.slotHosts.values()) {
      host.remove();
    }
    this.slotHosts.clear();
    // Ask any delegating chat container to drop its hosts too.
    for (const slotName of this.delegatedPluginSlots) {
      this.dispatchEvent(
        new CustomEvent("cds-aichat-markdown-plugin-host-unmount", {
          bubbles: true,
          composed: true,
          detail: { slotName },
        }),
      );
    }
    this.delegatedPluginSlots.clear();
    this.latestRendererDescriptors = [];
  }

  /**
   * Delegated handler for `cds-checkbox-changed` from rendered task-list
   * checkboxes. Resolves the toggled checkbox via the composed event path (a
   * host listener would otherwise see a retargeted `event.target`), reads the
   * identity stamped by the task-list plugin, and forwards the new state to a
   * consumer `checklist.onToggle`.
   */
  private handleChecklistToggle = (event: Event): void => {
    const onToggle = this.customRenderers?.checklist?.onToggle;
    if (!onToggle) {
      return;
    }
    const checkbox = event
      .composedPath()
      .find(
        (target): target is HTMLElement =>
          target instanceof HTMLElement &&
          target.tagName.toLowerCase() === "cds-checkbox",
      );
    const id = checkbox?.getAttribute("data-cds-aichat-checklist-id");
    if (!checkbox || id == null) {
      // Not a stamped task-list checkbox — ignore unrelated cds-checkboxes.
      return;
    }
    const checked = !!(event as CustomEvent<{ checked?: boolean }>).detail
      ?.checked;
    const label =
      checkbox.closest("cds-list-item, li")?.textContent?.trim() ?? "";
    onToggle({ id, label, checked });
  };

  private adoptLightDomMarkdown() {
    // Backward compatibility: treat static light-DOM text as initial markdown
    // when the explicit `markdown` property was not provided.
    if (!this.markdownPropertyExplicitlySet) {
      const lightDomMarkdown = readLightDomMarkdownSource(this);
      if (lightDomMarkdown) {
        // Set markdown without triggering the "explicitly set" flag
        this.isInternalMarkdownUpdate = true;
        this.markdown = lightDomMarkdown;
        this.isInternalMarkdownUpdate = false;
      }

      // Start observing Light DOM changes only if markdown property wasn't explicitly set
      this.startObservingLightDom();
    }
  }

  private startObservingLightDom() {
    if (this.lightDomObserver || this.markdownPropertyExplicitlySet) {
      return;
    }

    this.lightDomObserver = new MutationObserver((records) => {
      // Only update from Light DOM if markdown property still hasn't been explicitly set
      if (!this.markdownPropertyExplicitlySet) {
        // Mutations that happened entirely inside a portal host (a light-DOM
        // child with a `slot` attribute) are noise from the consumer's
        // overrides re-rendering — they don't change the markdown source.
        const relevant = records.filter(
          (record) => !isInsidePortalHost(record.target, this),
        );
        if (relevant.length === 0) {
          return;
        }

        // Process the mutation in a microtask so the DOM has settled. Track
        // it via a counter so `updateComplete` can await any concurrent
        // mutations without the fragility of a single-slot promise field.
        this.pendingLightDomMutations += 1;
        Promise.resolve()
          .then(() => {
            const lightDomMarkdown = readLightDomMarkdownSource(this);
            if (this.markdown !== lightDomMarkdown) {
              this.isInternalMarkdownUpdate = true;
              this.markdown = lightDomMarkdown;
              this.isInternalMarkdownUpdate = false;
            }
          })
          .finally(() => {
            this.pendingLightDomMutations -= 1;
          });
      } else {
        // If markdown was explicitly set, stop observing
        this.stopObservingLightDom();
      }
    });

    this.lightDomObserver.observe(this, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  private stopObservingLightDom() {
    if (this.lightDomObserver) {
      this.lightDomObserver.disconnect();
      this.lightDomObserver = null;
    }
  }

  protected willUpdate(changed: PropertyValues<this>) {
    // Handle initial render case: if markdown was set before connectedCallback,
    // Lit won't report it as "changed" but we still need to parse it
    const isInitialRender = !this.hasConnected && this.markdown;

    if (
      changed.has("removeHTML") ||
      changed.has("markdown") ||
      changed.has("markdownItPlugins") ||
      isInitialRender
    ) {
      // Properties that affect token tree structure require full reparse
      // - removeHTML: toggles post-parse HTML-token stripping
      // - markdown: updates the source text to parse
      // - markdownItPlugins: swaps the markdown-it instance, new parser rules
      // - isInitialRender: ensures pre-set markdown gets parsed on first render
      this.needsReparse = true;
      this.scheduleRender();
    } else if (
      // Properties that only affect rendering can skip reparsing
      // - sanitizeHTML: applies DOMPurify during render, doesn't change tokens
      // - string properties: change translated strings in rendered output
      // - streaming: affects loading states in rendered output
      // - customRenderers: only changes which tokens emit a slot
      changed.has("sanitizeHTML") ||
      changed.has("streaming") ||
      changed.has("customRenderers") ||
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
        const parsed = markdownToTokenTree(
          markdownContent,
          previousTreeForDiff,
          {
            removeHtml: this.removeHTML,
            markdownItPlugins: this.markdownItPlugins,
          },
        );
        nextTokenTree = parsed.tree;
        this.markdownItInstance = parsed.md;
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

      // Render-and-stash helper. Each invocation produces a fresh batch of
      // renderer-slot descriptors; the `updated()` reconcile then invokes
      // the consumer's `customRenderers` callbacks for each descriptor and
      // adopts the returned `HTMLElement` as a light-DOM slot host.
      const renderAndDispatch = (tree: TokenTree): void => {
        const { template, batch } = renderMarkdownTree(tree, {
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
          // Custom-renderer hooks
          customRenderers: this.customRenderers,
          md: this.markdownItInstance,
        });
        this.renderedContent = template;
        this.latestRendererDescriptors = batch;
      };

      if (this.streaming && this.isStreamingTableLoadingMode) {
        if (!this.hasRenderedStreamingTableLoadingFrame) {
          if (nextTokenTree !== this.tokenTree) {
            this.tokenTree = nextTokenTree;
          }
          renderAndDispatch(nextTokenTree);
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
      renderAndDispatch(renderTree);
    } catch (error) {
      console.error(`${CONSOLE_PREFIX} Failed to parse markdown`, error);
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

    // Drain any in-flight Light DOM mutation microtasks and their resulting
    // renders. Each iteration yields the event loop so newly enqueued
    // mutations can settle; the counter goes back to zero once everything
    // has flushed.
    while (this.pendingLightDomMutations > 0) {
      await Promise.resolve();

      const postMutationFlush = (
        this.scheduleRender as {
          flush?: () => Promise<void> | void;
        }
      ).flush?.();

      if (postMutationFlush instanceof Promise) {
        await postMutationFlush;
      }

      if (this.renderTask) {
        await this.renderTask;
      }
    }

    return result;
  }

  protected updated(changed: PropertyValues<this>) {
    super.updated(changed);
    this.reconcileCustomRendererHosts();
  }

  /**
   * Invoke the consumer's `customRenderers` callbacks once per descriptor and
   * adopt their returned `HTMLElement` as a `<span slot="…">` (for inline
   * plugin tokens) or `<div slot="…">` (block tokens and consumer renderers)
   * light-DOM child. Hosts persist across renders so a consumer returning the
   * same element reference produces no DOM churn; hosts whose slot names
   * dropped out of the latest descriptor batch are removed.
   *
   * @internal
   */
  private reconcileCustomRendererHosts() {
    const renderers = this.customRenderers;
    const descriptors = this.latestRendererDescriptors;
    const wanted = new Set<string>();

    for (const descriptor of descriptors) {
      if (descriptor.kind === "pluginFallback") {
        wanted.add(descriptor.slotName);

        // Offer the slot to a chat-container ancestor first. The chain
        // appends the host to its OWN light DOM (page DOM at the top of the
        // chain) so external CSS (e.g. a KaTeX stylesheet on the host page)
        // reaches the plugin output. If a listener calls preventDefault, it
        // has taken over hosting and we skip the local appendChild path.
        const alreadyDelegated = this.delegatedPluginSlots.has(
          descriptor.slotName,
        );
        if (!alreadyDelegated && !this.slotHosts.has(descriptor.slotName)) {
          const mountEvent = new CustomEvent(
            "cds-aichat-markdown-plugin-host-mount",
            {
              bubbles: true,
              composed: true,
              cancelable: true,
              detail: {
                slotName: descriptor.slotName,
                html: descriptor.html,
                isInline: descriptor.isInline,
              },
            },
          );
          this.dispatchEvent(mountEvent);
          if (mountEvent.defaultPrevented) {
            this.delegatedPluginSlots.add(descriptor.slotName);
          }
        } else if (alreadyDelegated) {
          // The chain owns this slot; push HTML updates through a second
          // event so streaming chunks reach the page-level host element.
          this.dispatchEvent(
            new CustomEvent("cds-aichat-markdown-plugin-host-update", {
              bubbles: true,
              composed: true,
              detail: {
                slotName: descriptor.slotName,
                html: descriptor.html,
              },
            }),
          );
        }

        if (this.delegatedPluginSlots.has(descriptor.slotName)) {
          continue;
        }

        // Fallback: no outer listener took over (standalone usage, e.g.
        // storybook). Adopt the host as our own light-DOM child, matching
        // the pre-event behavior so existing tests/stories keep working.
        let host = this.slotHosts.get(descriptor.slotName);
        if (!host) {
          const tag = descriptor.isInline ? "span" : "div";
          host = document.createElement(tag);
          host.setAttribute("slot", descriptor.slotName);
          this.slotHosts.set(descriptor.slotName, host);
          this.appendChild(host);
        }
        // Only rewrite innerHTML when the plugin output actually changed;
        // streaming re-renders frequently land here with the same HTML.
        if (host.innerHTML !== descriptor.html) {
          host.innerHTML = descriptor.html;
        }
        continue;
      }

      const callback = renderers?.[descriptor.kind];
      if (!callback) {
        continue;
      }
      let result: HTMLElement | null;
      try {
        result = (
          callback as (
            args: Parameters<NonNullable<typeof callback>>[0],
          ) => HTMLElement | null
        )({
          ...descriptor.data,
          token: descriptor.token,
          node: descriptor.node,
          slotName: descriptor.slotName,
        });
      } catch (error) {
        console.error(
          `[carbon-ai-chat-components] customRenderers.${descriptor.kind} threw`,
          error,
        );
        continue;
      }
      if (result == null) {
        const existing = this.slotHosts.get(descriptor.slotName);
        if (existing) {
          existing.remove();
          this.slotHosts.delete(descriptor.slotName);
        }
        continue;
      }
      wanted.add(descriptor.slotName);
      let host = this.slotHosts.get(descriptor.slotName);
      if (!host) {
        host = document.createElement("div");
        host.setAttribute("slot", descriptor.slotName);
        this.slotHosts.set(descriptor.slotName, host);

        // Offer the host to a chat-container ancestor so it lives in page
        // light DOM, where consumer-loaded global CSS (e.g. `@carbon/styles`
        // for a returned `@carbon/react` component) can reach it — the markdown
        // element's own light DOM sits inside the chat's shadow root, where it
        // cannot. Mirrors the plugin-fallback path above, but forwards the live
        // host element instead of an HTML string; the markdown element keeps
        // ownership of the host's content across renders. If no ancestor takes
        // over (standalone usage, e.g. storybook), host it locally.
        const mountEvent = new CustomEvent(
          "cds-aichat-markdown-plugin-host-mount",
          {
            bubbles: true,
            composed: true,
            cancelable: true,
            detail: {
              slotName: descriptor.slotName,
              element: host,
              isInline: false,
            },
          },
        );
        this.dispatchEvent(mountEvent);
        if (mountEvent.defaultPrevented) {
          this.delegatedPluginSlots.add(descriptor.slotName);
        } else {
          this.appendChild(host);
        }
      }
      if (host.firstChild !== result || host.childNodes.length !== 1) {
        host.replaceChildren(result);
      }
    }

    for (const [slotName, host] of this.slotHosts) {
      if (!wanted.has(slotName)) {
        host.remove();
        this.slotHosts.delete(slotName);
      }
    }

    // Tell any delegating chat container to drop hosts whose descriptor
    // disappeared (e.g. a streaming chunk removed a math node).
    for (const slotName of this.delegatedPluginSlots) {
      if (!wanted.has(slotName)) {
        this.dispatchEvent(
          new CustomEvent("cds-aichat-markdown-plugin-host-unmount", {
            bubbles: true,
            composed: true,
            detail: { slotName },
          }),
        );
        this.delegatedPluginSlots.delete(slotName);
      }
    }
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
