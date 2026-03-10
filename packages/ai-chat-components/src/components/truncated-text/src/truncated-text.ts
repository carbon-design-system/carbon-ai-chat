/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html, LitElement } from "lit";
import { property, query, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { carbonElement as customElement } from "@carbon/web-components/es/globals/decorators/carbon-element.js";
import prefix from "../../../globals/settings";
import "@carbon/web-components/es/components/tooltip/index.js";
import "@carbon/web-components/es/components/button/button.js";
import "@carbon/web-components/es/components/link/index.js";

import styles from "./truncated-text.scss?lit";

const componentName = "truncated-text";
export const blockClass = `${prefix}--${componentName}`;
const elementName = `${prefix}-${componentName}`; // cds-aichat-truncated-text
const carbonPrefix = "cds";

/**
 * TruncatedText.
 *
 * @element cds-aichat-truncated-text
 * @slot - Default slot for custom HTML content (alternative to value property)
 */
@customElement(elementName)
class CDSAIChatTruncatedText extends LitElement {
  /**
   * Specify how the tooltip should align with the content.
   */
  @property({ reflect: true, type: String })
  align = "top";

  /**
   * Specify whether a auto align functionality should be applied
   */
  @property({ type: Boolean, reflect: true })
  autoalign = false;

  /**
   * The label on the collapse button.
   */
  @property({ attribute: "collapse-label", type: String, reflect: true })
  collapseLabel = "";

  /**
   * The label on expand button.
   */
  @property({ attribute: "expand-label", type: String, reflect: true })
  expandLabel = "";

  /**
   * Unique identifier for the element.
   */
  @property({ type: String, reflect: true })
  id = "";

  /**
   * The maximum number of lines to display before truncation.
   */
  @property({ type: Number, reflect: true })
  lines = 0;

  /**
   * The method to display the full text when truncated. Options are "tooltip" or "expand". if not passed, the text would just be truncated with ellipsis.
   */
  @property({ type: String, reflect: true })
  type: "tooltip" | "expand" = "tooltip";

  /**
   * The string value to be truncated.
   */
  @property({ type: String, attribute: "value", reflect: true })
  value = "";

  @state() private _isOverflowing = false;
  @state() private _isExpanded = false;
  @state() private _maxHeight = "none";

  @query(`.${blockClass}_content`) private _textElement!: HTMLElement;
  private _lineHeight = 0;
  private _isLayered = false;
  private _resizeObserver?: ResizeObserver;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this._isLayered = !!this.closest(`${carbonPrefix}-layer`);
    this.type = this.type || "tooltip";
  }

  disconnectedCallback() {
    this._resizeObserver?.disconnect();
    super.disconnectedCallback();
  }

  protected firstUpdated() {
    requestAnimationFrame(() => {
      const computedStyle = getComputedStyle(this._textElement);
      this._lineHeight = parseFloat(computedStyle.lineHeight);
      this._setupResizeObserver();
      // Initial overflow check after first render
      this._updateOverflowStatus();
    });
  }

  protected updated(changed: Map<string, unknown>) {
    if (changed.has("lines") || changed.has("value")) {
      // Use requestAnimationFrame to ensure DOM is updated before checking overflow
      requestAnimationFrame(() => {
        this._updateOverflowStatus();
        this._updateMaxHeight();
      });
    }
  }

  private _updateMaxHeight() {
    if (this.type !== "expand") {
      return;
    }
    requestAnimationFrame(() => {
      if (!this._textElement) {
        return;
      }
      this._maxHeight =
        this.lines > 0 && !this._isExpanded
          ? `${this.lines * this._lineHeight}px`
          : `${this._textElement.scrollHeight}px`;
    });
  }

  private _setupResizeObserver() {
    if (!this._textElement) {
      return;
    }

    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }

    this._resizeObserver = new ResizeObserver(() => {
      this._updateOverflowStatus();
    });

    this._resizeObserver.observe(this);
  }

  private _updateOverflowStatus() {
    if (!this._textElement || this.lines <= 0) {
      return;
    }
    this._updateMaxHeight();
    const { scrollHeight, clientHeight } = this._textElement;
    const buffer = this._lineHeight / 2; // buffer of at least half of line height for a stable outcome

    const isOverflowing = scrollHeight > clientHeight + buffer;

    if (isOverflowing !== this._isOverflowing) {
      this._isOverflowing = isOverflowing;
    }
  }

  private _handleKeydown(evt: KeyboardEvent) {
    const { key } = evt;
    if (key === "Enter" || key === " ") {
      this._toggleExpansion();
    }
  }

  private _toggleExpansion() {
    this._isExpanded = !this._isExpanded;
    this._updateMaxHeight();
    this._textElement?.classList.add(`${blockClass}_transition`);
    const onTransitionEnd = () => {
      this._textElement?.querySelector("button")?.focus();
      this._textElement?.removeEventListener("transitionend", onTransitionEnd);
    };
    this._textElement?.addEventListener("transitionend", onTransitionEnd);

    /**
     * currently you cannot animate line-clamping
     * you can however animate max-height
     * this removes the clamping and then quickly adds it so you can see the ellipsis
     */
    if (this._isExpanded === false) {
      this._textElement?.classList.add(`${blockClass}_content--closing`);
      setTimeout(() => {
        this._textElement?.classList.remove(`${blockClass}_content--closing`);
      }, 100);
    }
  }

  private _renderToggleButton() {
    const className = classMap({
      [`${blockClass}_button-collapse`]: this._isExpanded,
      [`${blockClass}_button-expand`]: !this._isExpanded,
      [`${blockClass}_button-layered`]: this._isLayered,
      [`${blockClass}_button-hide`]: !this._isOverflowing && !this._isExpanded,
    });
    const label = this._isExpanded ? this.collapseLabel : this.expandLabel;
    return html`
      <span
        aria-controls=${this.id}
        aria-expanded=${this._isExpanded}
        class=${className}
        @click=${this._toggleExpansion}
        @keydown=${this._handleKeydown}
        role="button"
        tabIndex="0"
      >
        ${label}
      </span>
    `;
  }

  private _handleSlotChange() {
    // When slotted content changes, recalculate overflow
    requestAnimationFrame(() => {
      this._updateOverflowStatus();
    });
  }

  render() {
    // Always render slot, with value as fallback content
    // This allows styled slotted content to be displayed while value is used for tooltip
    const content = html`<slot @slotchange=${this._handleSlotChange}
      >${this.value}</slot
    >`;

    // For tooltip content, always use value property (plain text for tooltip)
    const tooltipContent = this.value;

    const contentClasses = classMap({
      [`${blockClass}_content`]: true,
      [`${blockClass}_content--expanded`]: this._isExpanded,
      [`${blockClass}_content--expand-type`]: this.type === "expand",
    });

    const valueBody = html`
      <div
        id=${this.id}
        class=${contentClasses}
        style="--line-clamp-value: ${this.lines}; --max-height-value: ${this
          ._maxHeight}"
      >
        ${content}
      </div>
    `;

    // For tooltip, show plain text in tooltip content
    const tooltipVariant = html`
      <cds-tooltip
        align=${this.align}
        autoalign=${this.autoalign}
        enter-delay-ms="0"
        leave-delay-ms="0"
      >
        ${valueBody}
        <cds-tooltip-content>${tooltipContent}</cds-tooltip-content>
      </cds-tooltip>
    `;

    const expandVariant = html`${valueBody} ${this._renderToggleButton()}`;

    return this.type === "tooltip" && this._isOverflowing
      ? tooltipVariant
      : expandVariant;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    [elementName]: CDSAIChatTruncatedText;
  }
}

export { CDSAIChatTruncatedText };
export default CDSAIChatTruncatedText;
