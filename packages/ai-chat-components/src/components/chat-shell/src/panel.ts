/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { LitElement, PropertyValues, html } from "lit";
import { property } from "lit/decorators.js";
import { carbonElement } from "../../../globals/decorators/carbon-element.js";
// @ts-ignore
import styles from "./panel.scss?lit";

const ANIMATION_START_DETECTION_DELAY_MS = 120;
const MESSAGES_MAX_WIDTH_FALLBACK = 672; // Fallback if CSS custom property is not set

type AnimationState = "closed" | "closing" | "opening" | "open";

@carbonElement("cds-aichat-panel")
class CdsAiChatPanel extends LitElement {
  static styles = styles;

  /**
   * @internal
   */
  private static readonly OBSERVED_SLOTS = [
    { name: "header", stateKey: "hasHeaderContent" as const },
    { name: "body", stateKey: "hasBodyContent" as const },
    { name: "footer", stateKey: "hasFooterContent" as const },
  ];

  /**
   * Controls whether the panel is open or closed
   */
  @property({ type: Boolean, reflect: true })
  open = false;

  /**
   * Sets the stacking priority of the panel (higher values appear on top)
   */
  @property({ type: Number, reflect: true })
  priority = 0;

  /**
   * Makes the panel take up the full width of its container
   */
  @property({ type: Boolean, attribute: "full-width", reflect: true })
  fullWidth = false;

  /**
   * Shows the chat header in the panel
   */
  @property({ type: Boolean, attribute: "show-chat-header", reflect: true })
  showChatHeader = false;

  /**
   * Shows a frame border around the panel
   */
  @property({ type: Boolean, attribute: "show-frame", reflect: true })
  showFrame = false;

  /**
   * Shows the AI gradient background
   */
  @property({ type: Boolean, attribute: "ai-enabled", reflect: true })
  aiEnabled = false;

  /**
   * Removes padding from the panel body
   */
  @property({ type: Boolean, attribute: "body-no-padding", reflect: true })
  bodyNoPadding = false;

  /**
   * Specifies the animation to use when opening the panel
   */
  @property({ type: String, attribute: "animation-on-open", reflect: true })
  animationOnOpen?: string;

  /**
   * Specifies the animation to use when closing the panel
   */
  @property({ type: String, attribute: "animation-on-close", reflect: true })
  animationOnClose?: string;

  /**
   * Makes the panel inert (non-interactive)
   */
  @property({ type: Boolean, reflect: true })
  inert = false;

  /**
   * @internal
   */
  private pendingAnimation: "opening" | "closing" | null = null;

  /**
   * @internal
   */
  private animationStarted = false;

  /**
   * @internal
   */
  private animationFallbackId: number | null = null;

  /**
   * @internal
   */
  private animationState: AnimationState = "closed";

  /**
   * @internal
   */
  private currentOpeningClass?: string;

  /**
   * @internal
   */
  private currentClosingClass?: string;

  /**
   * @internal
   */
  private resizeObserver?: ResizeObserver;

  /**
   * @internal
   */
  private hasHeaderContent = false;

  /**
   * @internal
   */
  private hasBodyContent = false;

  /**
   * @internal
   */
  private hasFooterContent = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.classList.add("panel", "panel-container");
    this.addEventListener("animationstart", this.handleAnimationStart);
    this.addEventListener("animationend", this.handleAnimationEnd);
    this.setupResizeObserver();
  }

  disconnectedCallback(): void {
    const panelBody = this.renderRoot.querySelector(".panel-body");
    if (panelBody) {
      panelBody.removeEventListener("scroll", this.handleBodyScroll);
    }

    this.removeEventListener("animationstart", this.handleAnimationStart);
    this.removeEventListener("animationend", this.handleAnimationEnd);
    this.clearAnimationFallback();
    this.pendingAnimation = null;
    this.cleanupResizeObserver();
    super.disconnectedCallback();
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    if (this.open && !this.inert) {
      this.animationState = "open";
    } else {
      this.animationState = "closed";
    }
    this.classList.toggle("panel--with-chat-header", this.showChatHeader);
    this.classList.toggle("panel--with-frame", this.showFrame);
    this.classList.toggle("panel--full-width", this.fullWidth);
    this.classList.toggle("panel--ai-theme", this.aiEnabled);
    this.classList.toggle("panel--body--no-padding", this.bodyNoPadding);
    this.updateHostClasses();
    this.observeSlotContent();

    // Add scroll listener to panel-body
    const panelBody = this.renderRoot.querySelector(".panel-body");
    if (panelBody) {
      panelBody.addEventListener("scroll", this.handleBodyScroll);
    }
  }

  protected updated(changedProperties: PropertyValues) {
    if (changedProperties.has("open") || changedProperties.has("inert")) {
      this.updateVisibilityState();
    }

    if (changedProperties.has("showChatHeader")) {
      this.classList.toggle("panel--with-chat-header", this.showChatHeader);
    }

    if (changedProperties.has("showFrame")) {
      this.classList.toggle("panel--with-frame", this.showFrame);
    }

    if (changedProperties.has("fullWidth")) {
      this.classList.toggle("panel--full-width", this.fullWidth);
    }

    if (changedProperties.has("aiEnabled")) {
      this.classList.toggle("panel--ai-theme", this.aiEnabled);
    }

    if (changedProperties.has("bodyNoPadding")) {
      this.classList.toggle("panel--body--no-padding", this.bodyNoPadding);
    }

    if (
      changedProperties.has("animationOnOpen") ||
      changedProperties.has("animationOnClose")
    ) {
      this.updateHostClasses();
    }
  }

  private updateVisibilityState() {
    const shouldBeOpen = this.open && !this.inert;
    if (shouldBeOpen) {
      if (this.animationState === "open" || this.animationState === "opening") {
        this.updateHostClasses();
        return;
      }
      this.openPanel();
    } else {
      if (
        this.animationState === "closed" ||
        this.animationState === "closing"
      ) {
        this.updateHostClasses();
        return;
      }
      this.closePanel();
    }
  }

  private openPanel() {
    this.dispatchEvent(
      new CustomEvent("openstart", { bubbles: true, composed: true }),
    );
    this.clearAnimationFallback();
    this.pendingAnimation = "opening";
    this.animationStarted = false;
    this.animationState = "opening";
    this.updateHostClasses();

    if (!this.shouldWaitForAnimation(this.animationOnOpen)) {
      this.completeOpen();
      return;
    }

    this.scheduleAnimationFallback();
  }

  private closePanel() {
    this.dispatchEvent(
      new CustomEvent("closestart", { bubbles: true, composed: true }),
    );
    this.clearAnimationFallback();
    this.pendingAnimation = "closing";
    this.animationStarted = false;
    this.animationState = "closing";
    this.updateHostClasses();

    if (!this.shouldWaitForAnimation(this.animationOnClose)) {
      this.completeClose();
      return;
    }

    this.scheduleAnimationFallback();
  }

  /**
   * @internal
   */
  private handleAnimationStart = (event: AnimationEvent) => {
    if (event.target !== this) {
      return;
    }
    this.animationStarted = true;
  };

  /**
   * @internal
   */
  private handleAnimationEnd = (event: AnimationEvent) => {
    if (event.target !== this) {
      return;
    }

    if (
      this.pendingAnimation === "opening" &&
      this.animationState === "opening"
    ) {
      this.completeOpen();
      return;
    }

    if (
      this.pendingAnimation === "closing" &&
      this.animationState === "closing"
    ) {
      this.completeClose();
    }
  };

  private completeOpen() {
    this.clearAnimationFallback();
    if (this.pendingAnimation === "opening") {
      this.pendingAnimation = null;
    }

    if (this.animationState !== "opening") {
      return;
    }

    this.animationStarted = false;
    this.animationState = "open";
    this.updateHostClasses();
    this.dispatchEvent(
      new CustomEvent("openend", { bubbles: true, composed: true }),
    );
  }

  private completeClose() {
    this.clearAnimationFallback();
    if (this.pendingAnimation === "closing") {
      this.pendingAnimation = null;
    }

    if (this.animationState !== "closing") {
      return;
    }

    this.animationStarted = false;
    this.animationState = "closed";
    this.updateHostClasses();
    this.dispatchEvent(
      new CustomEvent("closeend", { bubbles: true, composed: true }),
    );
  }

  private updateHostClasses() {
    this.classList.toggle(
      "panel-container--animating",
      this.animationState === "opening" || this.animationState === "closing",
    );
    this.classList.toggle("panel--open", this.animationState === "open");
    this.classList.toggle("panel--closed", this.animationState === "closed");

    this.updateAnimationClass(
      "opening",
      this.animationOnOpen,
      this.animationState === "opening",
    );
    this.updateAnimationClass(
      "closing",
      this.animationOnClose,
      this.animationState === "closing",
    );
  }

  private updateAnimationClass(
    type: "opening" | "closing",
    animation?: string,
    shouldApply?: boolean,
  ) {
    const prefix = `panel--${type}--`;
    if (type === "opening" && this.currentOpeningClass) {
      this.classList.remove(this.currentOpeningClass);
      this.currentOpeningClass = undefined;
    }
    if (type === "closing" && this.currentClosingClass) {
      this.classList.remove(this.currentClosingClass);
      this.currentClosingClass = undefined;
    }

    if (!animation || !shouldApply) {
      return;
    }

    const className = `${prefix}${animation}`;
    this.classList.add(className);
    if (type === "opening") {
      this.currentOpeningClass = className;
    } else {
      this.currentClosingClass = className;
    }
  }

  private shouldWaitForAnimation(animation?: string) {
    if (!animation) {
      return false;
    }

    if (typeof window === "undefined") {
      return false;
    }

    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return false;
    }

    return true;
  }

  private scheduleAnimationFallback() {
    if (typeof window === "undefined") {
      return;
    }
    this.clearAnimationFallback();
    this.animationFallbackId = window.setTimeout(() => {
      if (this.animationStarted) {
        return;
      }
      if (this.pendingAnimation === "opening") {
        this.completeOpen();
        return;
      }
      if (this.pendingAnimation === "closing") {
        this.completeClose();
      }
    }, ANIMATION_START_DETECTION_DELAY_MS);
  }

  private clearAnimationFallback() {
    if (this.animationFallbackId !== null && typeof window !== "undefined") {
      window.clearTimeout(this.animationFallbackId);
    }
    this.animationFallbackId = null;
  }

  private setupResizeObserver() {
    if (
      typeof window === "undefined" ||
      typeof ResizeObserver === "undefined"
    ) {
      return;
    }

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        this.updateWidthClass(width);
      }
    });

    this.resizeObserver.observe(this);
  }

  private cleanupResizeObserver() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = undefined;
    }
  }

  private getMessagesMaxWidth(): number {
    if (typeof window === "undefined") {
      return MESSAGES_MAX_WIDTH_FALLBACK;
    }

    const computedStyle = window.getComputedStyle(this);
    const customPropValue = computedStyle
      .getPropertyValue("--cds-aichat-messages-max-width")
      .trim();

    if (customPropValue) {
      // Parse the value (e.g., "672px" -> 672)
      const parsed = parseFloat(customPropValue);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    return MESSAGES_MAX_WIDTH_FALLBACK;
  }

  private updateWidthClass(width: number) {
    const maxWidth = this.getMessagesMaxWidth();
    const isNarrow = width <= maxWidth;
    this.classList.toggle("panel--with-less-than-messages-max-width", isNarrow);
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
        CdsAiChatPanel.OBSERVED_SLOTS.map(({ stateKey }) => [
          stateKey,
          this[stateKey],
        ]),
      );

      CdsAiChatPanel.OBSERVED_SLOTS.forEach(({ name, stateKey }) => {
        this[stateKey] = this.hasSlotContent(name);
      });

      const hasChanged = CdsAiChatPanel.OBSERVED_SLOTS.some(
        ({ stateKey }) => previousStates.get(stateKey) !== this[stateKey],
      );

      if (hasChanged) {
        this.requestUpdate();
      }
    };

    // Initial check
    updateSlotStates();

    // Observe slot changes
    const slots = CdsAiChatPanel.OBSERVED_SLOTS.map(({ name }) =>
      this.renderRoot.querySelector<HTMLSlotElement>(`slot[name="${name}"]`),
    ).filter((slot): slot is HTMLSlotElement => slot !== null);

    slots.forEach((slot) => {
      slot.addEventListener("slotchange", updateSlotStates);
    });
  }

  private handleBodyScroll = (event: Event) => {
    const target = event.target as HTMLElement;
    if (!target) {
      return;
    }

    // Dispatch a custom event with scroll information
    this.dispatchEvent(
      new CustomEvent("body-scroll", {
        bubbles: true,
        composed: true,
        detail: {
          scrollTop: target.scrollTop,
          scrollHeight: target.scrollHeight,
          clientHeight: target.clientHeight,
          scrollBottom: target.scrollTop + target.clientHeight,
          isAtBottom:
            target.scrollTop + target.clientHeight >= target.scrollHeight - 1,
          isScrollable: target.scrollHeight > target.clientHeight,
        },
      }),
    );
  };

  render() {
    const headerClasses = [
      "panel-header",
      this.hasHeaderContent ? "has-content" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const bodyClasses = ["panel-body", this.hasBodyContent ? "has-content" : ""]
      .filter(Boolean)
      .join(" ");

    const footerClasses = [
      "panel-footer",
      this.hasFooterContent ? "has-content" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return html`
      <div class="panel-content">
        <div class=${headerClasses}>
          <slot name="header"></slot>
        </div>
        <div class=${bodyClasses}>
          <slot name="body"></slot>
        </div>
        <div class=${footerClasses}>
          <slot name="footer"></slot>
        </div>
      </div>
    `;
  }
}

export default CdsAiChatPanel;
