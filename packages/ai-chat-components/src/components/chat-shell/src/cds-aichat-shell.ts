/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { LitElement, PropertyValues, html, nothing } from "lit";
import { property } from "lit/decorators.js";
// @ts-ignore
import styles from "./cds-aichat-shell.scss?lit";
import { PanelManager } from "./panel-manager.js";
import { WorkspaceManager } from "./workspace-manager.js";
import { carbonElement } from "../../../globals/decorators/carbon-element.js";
import "./cds-aichat-panel.js";

type StartOrEnd = "start" | "end";

@carbonElement("cds-aichat-shell")
class CdsAiChatShell extends LitElement {
  static styles = styles;

  /**
   * @internal
   */
  private static readonly OBSERVED_SLOTS = [
    { name: "header", stateKey: "hasHeaderContent" as const },
    { name: "header-after", stateKey: "hasHeaderAfterContent" as const },
    { name: "messages-before", stateKey: "hasMessagesBeforeContent" as const },
    { name: "footer", stateKey: "hasFooterContent" as const },
    { name: "input-after", stateKey: "hasInputAfterContent" as const },
    { name: "input", stateKey: "hasInputContent" as const },
    { name: "input-before", stateKey: "hasInputBeforeContent" as const },
    { name: "messages-after", stateKey: "hasMessagesAfterContent" as const },
  ];

  /**
   * Enables AI-specific theming for the chat shell
   */
  @property({ type: Boolean, attribute: "ai-enabled", reflect: true })
  aiEnabled = false;

  /**
   * Shows a frame border around the chat shell
   */
  @property({ type: Boolean, attribute: "show-frame", reflect: true })
  showFrame = false;

  /**
   * Applies rounded corners to the chat shell
   */
  @property({ type: Boolean, attribute: "rounded-corners", reflect: true })
  roundedCorners = false;

  /**
   * Shows the history panel in the chat shell
   */
  @property({ type: Boolean, attribute: "show-history", reflect: true })
  showHistory = false;

  /**
   * Shows the workspace panel in the chat shell
   */
  @property({ type: Boolean, attribute: "show-workspace", reflect: true })
  showWorkspace = false;

  /**
   * Determines the location of the workspace panel ("start" or "end")
   */
  @property({ type: String, attribute: "workspace-location", reflect: true })
  workspaceLocation: StartOrEnd = "start";

  /**
   * Determines the location of the history panel ("start" or "end")
   */
  @property({ type: String, attribute: "history-location", reflect: true })
  historyLocation: StartOrEnd = "start";

  /**
   * @internal
   */
  private panelManager?: PanelManager;

  /**
   * @internal
   */
  private workspaceManager?: WorkspaceManager;

  /**
   * @internal
   */
  private headerResizeObserver?: ResizeObserver;

  /**
   * @internal
   */
  private inputAndMessagesResizeObserver?: ResizeObserver;

  /**
   * @internal
   */
  private mainContentBodyResizeObserver?: ResizeObserver;

  /**
   * @internal
   */
  private cssPropertyObserver?: MutationObserver;

  /**
   * @internal
   */
  private lastKnownMessagesMaxWidth?: number;

  /**
   * @internal
   */
  private hasHeaderContent = false;

  /**
   * @internal
   */
  private hasHeaderAfterContent = false;

  /**
   * @internal
   */
  private hasMessagesBeforeContent = false;

  /**
   * @internal
   */
  private hasFooterContent = false;

  /**
   * @internal
   */
  private hasInputAfterContent = false;

  /**
   * @internal
   */
  private hasInputContent = false;

  /**
   * @internal
   */
  private hasInputBeforeContent = false;

  /**
   * @internal
   */
  private hasMessagesAfterContent = false;

  /**
   * @internal
   */
  private inputAndMessagesAtMaxWidth = false;

  /**
   * @internal
   */
  private shouldRenderHistory = true;

  private getWidgetClasses(): string {
    const workspaceState = this.workspaceManager?.getState();
    return [
      "shell",
      this.aiEnabled ? "ai-theme" : "",
      this.showFrame ? "" : "frameless",
      this.roundedCorners ? "rounded" : "",
      this.hasHeaderContent || this.hasHeaderAfterContent
        ? "has-header-content"
        : "",
      this.hasFooterContent ? "has-footer-content" : "",
      workspaceState?.isContracting ? "workspace-closing" : "",
      workspaceState?.isExpanding ? "workspace-opening" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  private getInputAndMessagesClasses(): string {
    return [
      "input-and-messages",
      this.hasMessagesBeforeContent ? "has-messages-before-content" : "",
      this.hasMessagesAfterContent ? "has-messages-after-content" : "",
      this.hasInputBeforeContent ? "has-input-before-content" : "",
      this.hasInputContent ? "has-input-content" : "",
      this.hasInputAfterContent ? "has-input-after-content" : "",
      this.inputAndMessagesAtMaxWidth ? "at-max-width" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  private renderSlot(name: string, className: string, condition = true) {
    if (!condition) {
      return nothing;
    }

    // Determine if this slot has content
    const hasContent = this.getSlotContentState(name);
    const classes = [className, hasContent ? "has-content" : ""]
      .filter(Boolean)
      .join(" ");

    return html`
      <div class=${classes} part="slot-${name}" data-panel-slot=${name}>
        <slot name=${name}></slot>
      </div>
    `;
  }

  private getSlotContentState(slotName: string): boolean {
    switch (slotName) {
      case "header":
        return this.hasHeaderContent;
      case "header-after":
        return this.hasHeaderAfterContent;
      case "messages-before":
        return this.hasMessagesBeforeContent;
      case "footer":
        return this.hasFooterContent;
      case "input-after":
        return this.hasInputAfterContent;
      case "input":
        return this.hasInputContent;
      case "input-before":
        return this.hasInputBeforeContent;
      case "messages-after":
        return this.hasMessagesAfterContent;
      case "messages":
        return true; // messages slot is always considered to have content
      default:
        return false;
    }
  }

  private renderWorkspaceInline() {
    const shouldRender = this.workspaceManager?.shouldRenderInline() ?? false;

    if (!shouldRender) {
      return nothing;
    }

    const workspaceState = this.workspaceManager?.getState();

    return html`
      <div class="workspace" part="slot-workspace" data-panel-slot="workspace">
        <div
          class=${workspaceState?.contentVisible
            ? "workspace-content"
            : "workspace-content workspace-content--hidden"}
          ?inert=${!workspaceState?.contentVisible}
        >
          <slot name="workspace"></slot>
        </div>
      </div>
    `;
  }

  private renderWorkspacePanel() {
    const shouldRender = this.workspaceManager?.shouldRenderPanel() ?? false;

    if (!shouldRender) {
      return nothing;
    }

    return html`
      <cds-aichat-panel
        data-internal-panel
        open
        priority="0"
        full-width
        show-chat-header
        animation-on-open="slide-in-from-bottom"
        animation-on-close="slide-out-to-bottom"
      >
        <div slot="body" class="workspace-slot">
          <slot name="workspace"></slot>
        </div>
      </cds-aichat-panel>
    `;
  }

  private renderHeader() {
    return html`
      <div class="header-with-header-after">
        ${this.renderHeaderSlot("header", "header")}
        ${this.renderHeaderSlot("header-after", "header-after")}
      </div>
    `;
  }

  private renderHeaderSlot(name: string, className: string) {
    const hasContent =
      name === "header"
        ? this.hasHeaderContent
        : name === "header-after"
          ? this.hasHeaderAfterContent
          : false;

    const classes = [className, hasContent ? "has-content" : ""]
      .filter(Boolean)
      .join(" ");

    return html`
      <div class=${classes} part="slot-${name}" data-panel-slot=${name}>
        <slot name=${name}></slot>
      </div>
    `;
  }

  private renderMessagesSection() {
    return html`
      <div class=${this.getInputAndMessagesClasses()}>
        ${this.renderSlot("messages-before", "messages-before")}
        ${this.renderSlot("messages", "messages")}
        ${this.renderSlot("messages-after", "messages-after")}
        ${this.renderSlot("input-before", "input-before")}
        ${this.renderSlot("input", "input")}
        ${this.renderSlot("input-after", "input-after")}
      </div>
    `;
  }

  private renderHistory() {
    if (!this.showHistory || !this.shouldRenderHistory) {
      return nothing;
    }
    return html`<div class="history">
      ${this.renderSlot("history", "history")}
    </div>`;
  }

  render() {
    return html`
      <div class=${this.getWidgetClasses()}>
        <div class="main-chat">
          ${this.renderHeader()}
          <div class="main-content">
            <div class="main-content-body">
              ${this.renderHistory()} ${this.renderWorkspaceInline()}
              ${this.renderMessagesSection()}
            </div>
            ${this.renderSlot("footer", "footer")}
          </div>
        </div>
        <div class="panels open" part="slot-panels">
          ${this.renderWorkspacePanel()}
          <slot name="panels"></slot>
        </div>
      </div>
    `;
  }

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    const panelsSlot = this.renderRoot.querySelector<HTMLSlotElement>(
      'slot[name="panels"]',
    );

    if (!panelsSlot) {
      return;
    }

    const widgetRoot = this.renderRoot.querySelector<HTMLElement>(".shell");

    if (!widgetRoot) {
      return;
    }

    this.panelManager = new PanelManager(panelsSlot, widgetRoot);
    this.panelManager.connect();

    this.workspaceManager = new WorkspaceManager(widgetRoot, this, {
      showWorkspace: this.showWorkspace,
      showHistory: this.showHistory,
      workspaceLocation: this.workspaceLocation,
      roundedCorners: this.roundedCorners,
    });
    this.workspaceManager.connect();

    this.observeHeaderHeight();
    this.observeInputAndMessagesWidth();
    this.observeMainContentBodyWidth();
    this.observeSlotContent();
    this.observeCssProperties();
  }

  private hasSlotContent(slotName: string): boolean {
    const slot = this.renderRoot.querySelector<HTMLSlotElement>(
      `slot[name="${slotName}"]`,
    );
    if (!slot) {
      return false;
    }

    return slot
      .assignedNodes({ flatten: true })
      .some(
        (node) =>
          node.nodeType === Node.ELEMENT_NODE ||
          (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()),
      );
  }

  private observeSlotContent() {
    const updateSlotStates = () => {
      const previousStates = new Map(
        CdsAiChatShell.OBSERVED_SLOTS.map(({ stateKey }) => [
          stateKey,
          this[stateKey],
        ]),
      );

      CdsAiChatShell.OBSERVED_SLOTS.forEach(({ name, stateKey }) => {
        this[stateKey] = this.hasSlotContent(name);
      });

      const hasChanged = CdsAiChatShell.OBSERVED_SLOTS.some(
        ({ stateKey }) => previousStates.get(stateKey) !== this[stateKey],
      );

      if (hasChanged) {
        this.requestUpdate();
      }
    };

    // Initial check
    updateSlotStates();

    // Observe slot changes
    const slots = CdsAiChatShell.OBSERVED_SLOTS.map(({ name }) =>
      this.renderRoot.querySelector<HTMLSlotElement>(`slot[name="${name}"]`),
    ).filter((slot): slot is HTMLSlotElement => slot !== null);

    slots.forEach((slot) => {
      slot.addEventListener("slotchange", updateSlotStates);
    });
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);

    if (
      changedProperties.has("showWorkspace") ||
      changedProperties.has("showHistory") ||
      changedProperties.has("workspaceLocation") ||
      changedProperties.has("roundedCorners")
    ) {
      this.workspaceManager?.updateConfig({
        showWorkspace: this.showWorkspace,
        showHistory: this.showHistory,
        workspaceLocation: this.workspaceLocation,
        roundedCorners: this.roundedCorners,
      });
    }

    this.panelManager?.refresh();
  }

  disconnectedCallback() {
    this.panelManager?.disconnect();
    this.workspaceManager?.disconnect();
    this.headerResizeObserver?.disconnect();
    this.inputAndMessagesResizeObserver?.disconnect();
    this.mainContentBodyResizeObserver?.disconnect();
    this.cssPropertyObserver?.disconnect();
    super.disconnectedCallback();
  }

  private observeInputAndMessagesWidth() {
    // We need to observe the :host width, not .input-and-messages width
    // When :host < max-width, .input-and-messages fills the container and needs rounded corners
    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const messagesMaxWidth = this.getMessagesMaxWidth();

    const updateAtMaxWidth = (hostWidth: number) => {
      // When host is less than max-width, input-and-messages is "at max width" (filling container)
      const isAtMaxWidth = hostWidth < messagesMaxWidth;
      if (this.inputAndMessagesAtMaxWidth !== isAtMaxWidth) {
        this.inputAndMessagesAtMaxWidth = isAtMaxWidth;
        this.requestUpdate();
      }
    };

    const measure = () => {
      const rect = this.getBoundingClientRect();
      updateAtMaxWidth(rect.width);
    };

    this.inputAndMessagesResizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target !== this) {
          continue;
        }
        const borderBoxSize = Array.isArray(entry.borderBoxSize)
          ? entry.borderBoxSize[0]
          : entry.borderBoxSize;
        if (borderBoxSize?.inlineSize) {
          updateAtMaxWidth(borderBoxSize.inlineSize);
        } else {
          updateAtMaxWidth(entry.contentRect.width);
        }
      }
    });

    this.inputAndMessagesResizeObserver.observe(this);
    measure();
  }

  private observeMainContentBodyWidth() {
    if (typeof ResizeObserver === "undefined" || !this.showHistory) {
      return;
    }

    const mainContentBody =
      this.renderRoot.querySelector<HTMLElement>(".main-content-body");

    if (!mainContentBody) {
      return;
    }

    const updateHistoryVisibility = (width: number) => {
      const messagesMinWidth = this.getCssLengthFromProperty(
        "--cds-aichat-messages-min-width",
        320,
      );
      const historyWidth = this.getCssLengthFromProperty(
        "--cds-aichat-history-width",
        320,
      );

      const requiredWidth = messagesMinWidth + historyWidth;
      const newShouldRenderHistory = width >= requiredWidth;

      if (this.shouldRenderHistory !== newShouldRenderHistory) {
        this.shouldRenderHistory = newShouldRenderHistory;
        this.requestUpdate();
      }
    };

    this.mainContentBodyResizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target !== mainContentBody) {
          continue;
        }
        const borderBoxSize = Array.isArray(entry.borderBoxSize)
          ? entry.borderBoxSize[0]
          : entry.borderBoxSize;
        if (borderBoxSize?.inlineSize) {
          updateHistoryVisibility(borderBoxSize.inlineSize);
        } else {
          updateHistoryVisibility(entry.contentRect.width);
        }
      }
    });

    this.mainContentBodyResizeObserver.observe(mainContentBody);

    // Initial measurement
    const rect = mainContentBody.getBoundingClientRect();
    updateHistoryVisibility(rect.width);
  }

  private getCssLengthFromProperty(
    propertyName: string,
    fallback: number,
  ): number {
    const value = getComputedStyle(this).getPropertyValue(propertyName).trim();
    if (!value) {
      return fallback;
    }
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  private getMessagesMaxWidth(): number {
    const value = getComputedStyle(this)
      .getPropertyValue("--cds-aichat-messages-max-width")
      .trim();
    if (!value) {
      return 672; // Default fallback from SCSS
    }
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? 672 : parsed;
  }

  private observeHeaderHeight() {
    const headerWrapper = this.renderRoot.querySelector<HTMLElement>(
      ".header-with-header-after",
    );

    if (!headerWrapper || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateHeight = (height: number) => {
      this.style.setProperty("--cds-aichat--header-height", `${height}px`);
    };

    const measure = () => {
      const rect = headerWrapper.getBoundingClientRect();
      updateHeight(rect.height);
    };

    this.headerResizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target !== headerWrapper) {
          continue;
        }
        const borderBoxSize = Array.isArray(entry.borderBoxSize)
          ? entry.borderBoxSize[0]
          : entry.borderBoxSize;
        if (borderBoxSize?.blockSize) {
          updateHeight(borderBoxSize.blockSize);
        } else {
          updateHeight(entry.contentRect.height);
        }
      }
    });

    this.headerResizeObserver.observe(headerWrapper);
    measure();
  }

  /**
   * Observe CSS custom properties that affect messages max width.
   * When --cds-aichat-messages-max-width changes, recalculate the at-max-width state.
   */
  private observeCssProperties(): void {
    if (typeof MutationObserver === "undefined") {
      return;
    }

    // Store initial value
    this.lastKnownMessagesMaxWidth = this.getMessagesMaxWidth();

    // Watch for style attribute changes on the host element
    this.cssPropertyObserver = new MutationObserver(() => {
      this.checkMessagesMaxWidthChange();
    });

    this.cssPropertyObserver.observe(this, {
      attributes: true,
      attributeFilter: ["style"],
    });
  }

  /**
   * Check if --cds-aichat-messages-max-width has changed and trigger recalculation.
   */
  private checkMessagesMaxWidthChange(): void {
    const currentMaxWidth = this.getMessagesMaxWidth();

    if (currentMaxWidth !== this.lastKnownMessagesMaxWidth) {
      this.lastKnownMessagesMaxWidth = currentMaxWidth;

      // Recalculate the at-max-width state with the new max width
      const rect = this.getBoundingClientRect();
      const isAtMaxWidth = rect.width < currentMaxWidth;
      if (this.inputAndMessagesAtMaxWidth !== isAtMaxWidth) {
        this.inputAndMessagesAtMaxWidth = isAtMaxWidth;
        this.requestUpdate();
      }
    }
  }
}

export default CdsAiChatShell;
