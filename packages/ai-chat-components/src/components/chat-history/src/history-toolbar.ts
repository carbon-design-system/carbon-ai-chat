/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html, nothing } from "lit";
import { property } from "lit/decorators.js";
import spread from "@carbon/web-components/es/globals/directives/spread.js";
import prefix from "../../../globals/settings.js";
import { carbonElement } from "../../../globals/decorators/carbon-element.js";

import "@carbon/web-components/es/components/search/search.js";
import "@carbon/web-components/es/components/icon-button/index.js";
import AddComment16 from "@carbon/icons/es/add-comment/16.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import styles from "./chat-history.scss?lit";

/**
 * Attributes that can be passed to the cds-search component.
 */
export interface SearchAttributes {
  /** Label text for the search icon */
  "label-text"?: string;
  /** Placeholder text for the search input */
  placeholder?: string;
  /** Whether the search input is disabled */
  disabled?: boolean;
  /** Value of the search input */
  value?: string;
  /** Label for the close button */
  "close-button-label-text"?: string;
}

/**
 * Chat History Toolbar.
 *
 * @element cds-aichat-history-toolbar
 *
 */
@carbonElement(`${prefix}-history-toolbar`)
class CDSAIChatHistoryToolbar extends LitElement {
  /**
   * Sets default slot value to toolbar
   */
  @property({ type: String, reflect: true })
  slot = "toolbar";

  /**
   * Label for new chat button.
   */
  @property({ type: String, attribute: "new-chat-label" })
  newChatLabel = "New chat";

  /**
   * `true` to remove search from toolbar.
   */
  @property({ type: Boolean, attribute: "search-off", reflect: true })
  searchOff;

  /**
   * @deprecated Use `searchAttributes['close-button-label-text']` instead.
   * This property will be removed in a future major version.
   */
  @property({ type: String, attribute: "close-button-label-text" })
  closeButtonLabelText = "Clear search";

  /**
   * Optional attributes to pass to the cds-search component.
   * Allows customization of search behavior and appearance.
   *
   * Note: This is a JavaScript property only (not an HTML attribute).
   * Use `.searchAttributes` to set it programmatically.
   *
   * Default values:
   * - `close-button-label-text`: "Clear search" (can be overridden via deprecated `closeButtonLabelText` property)
   *
   * @example
   * ```javascript
   * // Via JavaScript property
   * const toolbar = document.querySelector('cds-aichat-history-toolbar');
   * toolbar.searchAttributes = {
   *   'label-text': 'Search conversations',
   *   placeholder: 'Type to search...',
   *   disabled: false,
   *   value: ''
   * };
   * ```
   *
   * @example
   * ```html
   * <!-- Via Lit template binding -->
   * <cds-aichat-history-toolbar
   *   .searchAttributes=${{
   *     'label-text': 'Search conversations',
   *     placeholder: 'Type to search...'
   *   }}
   * ></cds-aichat-history-toolbar>
   * ```
   */
  @property({ type: Object, attribute: false })
  searchAttributes?: SearchAttributes;

  /**
   * Handles new chat button click event
   */
  _handleNewChatButtonClick = () => {
    this.dispatchEvent(
      new CustomEvent("chat-history-new-chat-click", {
        bubbles: true,
        composed: true,
      }),
    );
  };

  render() {
    const {
      closeButtonLabelText,
      newChatLabel,
      searchOff,
      searchAttributes,
      _handleNewChatButtonClick: handleNewChatButtonClick,
    } = this;

    // Use searchAttributes['close-button-label-text'] if provided, otherwise fall back to deprecated property
    const effectiveCloseButtonLabel =
      searchAttributes?.["close-button-label-text"] ?? closeButtonLabelText;

    return html` <slot name="actions-start"></slot>
      ${!searchOff
        ? html`<cds-search
            close-button-label-text=${effectiveCloseButtonLabel}
            ${searchAttributes ? spread(searchAttributes as any) : nothing}
          ></cds-search>`
        : nothing}
      <slot name="actions-end"></slot>
      <cds-icon-button align="top-right" @click=${handleNewChatButtonClick}>
        ${iconLoader(AddComment16, {
          slot: "icon",
        })}
        <span slot="tooltip-content">${newChatLabel}</span>
      </cds-icon-button>`;
  }

  static styles = styles;
}

export { CDSAIChatHistoryToolbar };
export default CDSAIChatHistoryToolbar;
