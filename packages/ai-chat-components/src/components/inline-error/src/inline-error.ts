/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html } from 'lit';
import { property } from 'lit/decorators.js';
import { iconLoader } from '@carbon/web-components/es/globals/internal/icon-loader.js';
import ErrorFilled16 from '@carbon/icons/es/error--filled/16.js';
import { carbonElement } from '../../../globals/decorators/index.js';
import '../../markdown/index.js';
import prefix from '../../../globals/settings.js';
import commonStyles from '../../../globals/scss/common.scss?lit';
import styles from './inline-error.scss?lit';

const blockClass = `${prefix}-inline-error`;

/**
 * An error row: an error icon followed by error text. The text content of
 * the element is the error message. It is rendered as markdown with all HTML
 * removed, so put text in the element, not child markup. The text is read when
 * the element renders.
 *
 * @experimental
 * @element cds-aichat-inline-error
 */
@carbonElement(blockClass)
class CDSAIChatInlineError extends LitElement {
  static styles = [commonStyles, styles];

  /**
   * Accessible label for the error icon. Without a label the icon is hidden
   * from assistive technology.
   */
  @property({ type: String, attribute: 'icon-label' })
  iconLabel = '';

  render() {
    return html`
      <span class="${blockClass}__icon"
        >${iconLoader(
          ErrorFilled16,
          this.iconLabel ? { 'aria-label': this.iconLabel } : {}
        )}</span
      >
      <span class="${blockClass}__text"
        ><cds-aichat-markdown
          remove-html
          .markdown=${(this.textContent ?? '').trim()}></cds-aichat-markdown
      ></span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cds-aichat-inline-error': CDSAIChatInlineError;
  }
}

export { CDSAIChatInlineError };
export default CDSAIChatInlineError;
