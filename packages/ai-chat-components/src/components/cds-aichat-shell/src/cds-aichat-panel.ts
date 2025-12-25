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
import "../../card/index.js";

// @ts-ignore
import styles from "./cds-aichat-panel.scss?lit";

const ANIMATION_START_DETECTION_DELAY_MS = 120;

type AnimationState = "closed" | "closing" | "opening" | "open";

@carbonElement("cds-aichat-panel")
class CdsAiChatPanel extends LitElement {
  static styles = styles;

  @property({ type: Boolean, reflect: true })
  open = false;

  @property({ type: Number, reflect: true })
  priority = 0;

  @property({ type: Boolean, attribute: "full-width", reflect: true })
  fullWidth = false;

  @property({ type: Boolean, attribute: "show-chat-header", reflect: true })
  showChatHeader = false;

  @property({ type: Boolean, attribute: "rounded-corners", reflect: true })
  roundedCorners = false;

  @property({ type: Boolean, attribute: "show-frame", reflect: true })
  showFrame = false;

  @property({ type: String, attribute: "animation-on-open", reflect: true })
  animationOnOpen?: string;

  @property({ type: String, attribute: "animation-on-close", reflect: true })
  animationOnClose?: string;

  @property({ type: Boolean, reflect: true })
  inert = false;

  private pendingAnimation: "opening" | "closing" | null = null;
  private animationStarted = false;
  private animationFallbackId: number | null = null;
  private animationState: AnimationState = "closed";
  private currentOpeningClass?: string;
  private currentClosingClass?: string;

  connectedCallback(): void {
    super.connectedCallback();
    this.classList.add("panel", "panel-container");
    this.addEventListener("animationstart", this.handleAnimationStart);
    this.addEventListener("animationend", this.handleAnimationEnd);
  }

  disconnectedCallback(): void {
    this.removeEventListener("animationstart", this.handleAnimationStart);
    this.removeEventListener("animationend", this.handleAnimationEnd);
    this.clearAnimationFallback();
    this.pendingAnimation = null;
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
    this.updateHostClasses();
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

  private handleAnimationStart = (event: AnimationEvent) => {
    if (event.target !== this) {
      return;
    }
    this.animationStarted = true;
  };

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

  render() {
    return html` <div class="panel">
      ${this.showFrame
        ? html`<cds-aichat-card class="panel-content" role="dialog">
            <div slot="header">
              <slot name="header"></slot>
            </div>
            <div slot="body" class="panel-body">
              <slot name="body"></slot>
            </div>
            <div slot="footer">
              <slot name="footer"></slot>
            </div>
          </cds-aichat-card>`
        : html`<div class="panel-content" role="dialog"><slot name="body"></slot></body>`}
    </div>`;
  }
}

export default CdsAiChatPanel;
